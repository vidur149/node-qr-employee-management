import * as Hapi from "hapi";
import * as Boom from "boom";
import { IServerConfigurations } from "../config";
import { IDb } from "../config";
import { imageFilter } from "../utilts";
export default class UserController {
  private configs: IServerConfigurations;
  private database: IDb;

  constructor(configs: IServerConfigurations, database: IDb) {
    this.database = database;
    this.configs = configs;
  }

  public async signup(request: Hapi.Request, reply: Hapi.Base_Reply) {
    try {
      await this.database.user.create(request.payload);
      return reply
        .response({
          success: true
        })
        .code(201);
    } catch (err) {
      if (err.parent.errno === 1062) {
        throw Boom.conflict("User with the given name already exists");
      } else {
        throw Boom.boomify(err);
      }
    }
  }

  public async login(request: Hapi.Request, reply: Hapi.Base_Reply) {
    try {
      const user = await this.database.user.findOne({
        where: {
          name: request.payload.name
        },
        attributes: [
          "id",
          "name",
          "mobile1",
          "password",
          "role",
          "dob",
          "active",
          "photo"
        ]
      });
      if (user) {
        if (user.checkPassword(request.payload.password)) {
          const User: any = user.get({ plain: true });
          const jwt = user.generateJwt(this.configs);
          delete User["password"]; // remove password from the user object
          delete User["active"]; // remove password from the user object
          return reply.response({
            jwt,
            user: User
          });
        } else {
          throw Boom.unauthorized("Password is incorrect.");
        }
      } else {
        throw Boom.unauthorized("Name or Password is incorrect.");
      }
    } catch (err) {
      return Boom.boomify(err);
    }
  }

  public async uploadPhoto(request: Hapi.Request, reply: Hapi.Base_Reply) {
    try {
      const fileData = request.payload.file;
      const fileName = request.payload.file.hapi.filename;
      const credentials = request.auth.credentials;
      if (imageFilter(fileName)) {
        const response = await this.database.user.uploadPhoto(
          fileData,
          this.configs.aws,
          credentials.id
        );
        return reply
          .response({
            mediaUri: response.link
          })
          .code(201);
      } else {
        return reply.response(Boom.badRequest("File type not supported"));
      }
    } catch (err) {
      return Boom.boomify(err);
    }
  }

  public async getCompleteProfile(
    request: Hapi.Request,
    reply: Hapi.Base_Reply
  ) {
    try {
      const { id } = request.params;
      const credentials = request.auth.credentials;
      const user = await this.database.user.findById(id || credentials.id, {
        include: [
          {
            model: this.database.bank
          }
        ]
      });
      if (user) {
        const User: any = user.get({ plain: true });
        delete User["password"]; // remove password from the user object
        delete User["active"]; // remove password from the user object
        return reply.response(User);
      } else {
        throw Boom.notFound("User not found");
      }
    } catch (err) {
      return Boom.boomify(err);
    }
  }

  public async getProfile(request: Hapi.Request, reply: Hapi.Base_Reply) {
    try {
      const fileData = request.payload.file;
      const fileName = request.payload.file.hapi.filename;
      const credentials = request.auth.credentials;
      if (imageFilter(fileName)) {
        const response = await this.database.user.uploadPhoto(
          fileData,
          this.configs.aws,
          credentials.id
        );
        return reply
          .response({
            mediaUri: response.link
          })
          .code(201);
      } else {
        return reply.response(Boom.badRequest("File type not supported"));
      }
    } catch (err) {
      return Boom.boomify(err);
    }
  }

  public requestResetPassword(request: Hapi.Request, reply: Hapi.Base_Reply) {
    return this.database.user
      .findOne({
        where: {
          name: request.payload.name
        }
      })
      .then((user: any) => {
        if (user) {
          return user.generatePasswordResetCode(this.database.resetCode);
        } else {
          throw Boom.notFound("Username not registered on platform");
        }
      })
      .then((code: string) => {
        return reply.response({
          code: code
        });
      })
      .catch(err => Boom.boomify(err));
  }

  public resetPassword(request: Hapi.Request, reply: Hapi.Base_Reply) {
    return this.database.user
      .findOne({
        where: {
          name: request.payload.name
        }
      })
      .then((user: any) => {
        if (user) {
          return user.resetPassword(
            this.database.resetCode,
            request.payload.code,
            request.payload.password
          );
        } else {
          throw Boom.notFound("name not registered on platform");
        }
      })
      .then(() => {
        return reply.response({
          reset: true
        });
      })
      .catch(err => Boom.boomify(err));
  }

  public getUsers(request: Hapi.Request, reply: Hapi.Base_Reply) {
    return this.database.user
      .getAllPaginatedUsers(
        request.query.size,
        request.query.page,
        this.configs.baseUrl
      )
      .then((response: any) => {
        return reply.response(response);
      })
      .catch(err => Boom.boomify(err));
  }

  public deleteUser(request: Hapi.Request, reply: Hapi.Base_Reply) {
    const { id } = request.params;
    const credentials = request.auth.credentials;
    if (id === credentials.id) {
      return Boom.forbidden("You can not delete yourself");
    } else {
      return this.database.user
        .findOne({
          where: {
            id: id
          }
        })
        .then((user: any) => {
          if (user) {
            return user.destroy();
          }
        })
        .then(() => {
          return reply
            .response({
              deleted: true
            })
            .code(200);
        })
        .catch(err => {
          throw Boom.boomify(err);
        });
    }
  }
}
