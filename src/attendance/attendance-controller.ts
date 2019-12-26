import * as moment from "moment";
import * as Sequelize from "sequelize";
import * as Hapi from "hapi";
import * as Boom from "boom";
import { IServerConfigurations } from "../config";
import { IDb } from "../config";
import {
  morningRange,
  eveningRange,
  nightRange,
  TimeRange
} from "../constants";
import { timeInRange } from "../utilts";

const markAttendance = async (
  timeRange: TimeRange[],
  shift: string,
  payload: { userId: number; comments?: string },
  records: any[],
  database: IDb
): Promise<any> => {
  const shiftStart = moment()
    .utc()
    .utcOffset(330)
    .startOf("day")
    .add(timeRange[0].hours, "hours")
    .add(timeRange[0].minutes, "minutes");

  const shiftEnd = moment()
    .utc()
    .utcOffset(330)
    .startOf("day")
    .add(timeRange[1].hours, "hours")
    .add(timeRange[1].minutes, "minutes");

  const morningRecords = records.filter(r =>
    timeInRange(
      shiftStart,
      shiftEnd,
      moment(r.createdAt)
        .utc()
        .utcOffset(330)
    )
  );
  if (
    timeInRange(
      shiftStart,
      shiftEnd,
      moment()
        .utc()
        .utcOffset(330)
    )
  ) {
    if (!morningRecords.length) {
      try {
        await database.attendance.create({ ...payload, shift });
        return true;
      } catch (err) {
        throw Boom.boomify(err);
      }
    } else {
      throw Boom.conflict("Attendance already marked for morning shift");
    }
  } else {
    return false;
  }
};

export class AttendanceController {
  private configs: IServerConfigurations;
  private database: IDb;

  constructor(configs: IServerConfigurations, database: IDb) {
    this.database = database;
    this.configs = configs;
  }

  // checks server time and marks attendance according to the shift range
  // if shift is present in user and not already marked present then mark present
  // else mark the user is exiting and make an entry in the logs db
  // if the user comes out of range then the shift should be marked as other
  public async markPresent(request: Hapi.Request, reply: Hapi.Base_Reply) {
    const Op = Sequelize.Op;

    try {
      const u = await this.database.user.findOne({
        where: {
          id: request.payload.userId
        }
      });
      if (!u) {
        throw Boom.badRequest("User not found");
      }
      const user = u.get({ plain: true });
      const records = await this.database.attendance.findAll({
        order: [["createdAt", "DESC"]],
        where: {
          userId: user.id,
          createdAt: {
            [Op.lte]: moment()
              .utc()
              .utcOffset(330)
              .endOf("day")
              .toDate(),
            [Op.gte]: moment()
              .utc()
              .utcOffset(330)
              .startOf("day")
              .toDate()
          }
        }
      });
      const plainAttendance = [];
      records.forEach(r => plainAttendance.push(r.get({ plain: true })));
      if (user.morning) {
        if (
          await markAttendance(
            morningRange,
            "morning",
            request.payload,
            records,
            this.database
          )
        ) {
          return reply
            .response({
              success: true
            })
            .code(201);
        }
      }
      if (user.evening) {
        if (
          await markAttendance(
            eveningRange,
            "evening",
            request.payload,
            records,
            this.database
          )
        ) {
          return reply
            .response({
              success: true
            })
            .code(201);
        }
      }
      if (user.night) {
        if (
          await markAttendance(
            nightRange,
            "night",
            request.payload,
            records,
            this.database
          )
        ) {
          return reply
            .response({
              success: true
            })
            .code(201);
        }
      }
      throw Boom.badRequest("Cannot mark you present");
    } catch (err) {
      throw Boom.boomify(err);
    }
  }

  public login(request: Hapi.Request, reply: Hapi.Base_Reply) {
    return this.database.user
      .findOne({
        where: {
          name: request.payload.name
        },
        attributes: ["id", "name", "createdAt", "password", "role"]
      })
      .then((user: any) => {
        if (user) {
          if (user.checkPassword(request.payload.password)) {
            const User: any = user.get({ plain: true });
            const jwt = user.generateJwt(this.configs);
            delete User["password"]; // remove password from the user object
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
      })
      .catch(err => Boom.boomify(err));
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
