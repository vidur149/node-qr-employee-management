import * as Sequelize from "sequelize";
import * as bcrypt from "bcryptjs";
import * as Jwt from "jsonwebtoken";
import * as Boom from "boom";
import { roles } from "../constants";
import S3 = require("aws-sdk/clients/s3");
import { AWS } from "../config";

export default function(sequelize, DataTypes) {
  const User = sequelize.define(
    "user",
    {
      id: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      password: {
        type: Sequelize.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      role: {
        type: Sequelize.ENUM(...roles),
        allowNull: false,
        validate: {
          notEmpty: true
        },
        defaultValue: roles[roles.length - 1]
      },
      mobile1: {
        type: Sequelize.BIGINT(11),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      mobile2: {
        type: Sequelize.BIGINT(11),
        allowNull: false,
        defaultValue: 0
      },
      dob: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      photo: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      address: {
        type: Sequelize.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      city: {
        type: Sequelize.STRING(80),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      state: {
        type: Sequelize.STRING(80),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      morning: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      evening: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      night: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      salary: {
        type: Sequelize.BIGINT(10),
        allowNull: false,
        validate: {
          notEmpty: true
        },
        defaultValue: 0
      }
    },
    {
      timestamps: true,
      paranoid: true,
      hooks: {
        beforeCreate: (user, options) => {
          user.password = User.hashPassword(user.password);
        }
      },
      indexes: [
        {
          unique: true,
          fields: ["name", "role", "mobile1"]
        }
      ]
    }
  );

  User.associate = (models: any): void => {
    models.user.hasOne(models.bank);
    models.user.hasMany(models.attendance);
  };

  User.hashPassword = function(password: string): string {
    return bcrypt.hashSync(password, 8);
  };

  User.uploadPhoto = function(fileData, config: AWS, id: number) {
    const s3 = new S3({
      accessKeyId: config.keyId,
      secretAccessKey: config.secret
    });

    const params = {
      Bucket: config.bucket,
      Key: `profile-pics/${id}/${fileData.hapi.filename}`,
      Body: fileData._data,
      ACL: "public-read"
    };

    // Uploading files to the bucket
    return new Promise((resolve, reject) => {
      s3.upload(params, function(err, data) {
        if (err) {
          throw reject(err);
        }
        User.update(
          {
            photo: data.Location
          },
          {
            where: {
              id
            }
          }
        )
          .then(() => {
            return resolve({ link: data.Location });
          })
          .catch(err => {
            throw reject(err);
          });
      });
    });
  };

  User.prototype.checkPassword = function(password: string): boolean {
    return bcrypt.compareSync(password, this.password);
  };

  /**
   * Generates JWT(API_KEY) which will be used for authenticating a user.
   */
  User.prototype.generateJwt = function(config: any): string {
    let role: string = this.role.toLowerCase();
    let jwtData: any = {
      role,
      id: this.id,
      active: this.active
    };
    return Jwt.sign(jwtData, config.jwtSecret, {
      expiresIn: config.jwtExpiration
    });
  };

  /**
   * Generates a unique code that will be used by the user for resetting his/her password.
   */
  User.prototype.generatePasswordResetCode = function(
    resetCodeModel: any
  ): Promise<string> {
    return resetCodeModel
      .findOne({
        where: {
          userId: this.id
        }
      })
      .then((code: any) => {
        if (code) {
          return code.updateCode(); // replaces the old code with a new code in the database.
        } else {
          return resetCodeModel.createCode(this.id); // creates the code for the first time.
        }
      })
      .then((code: any) => {
        return code.code;
      });
  };

  /**
   * Updates the password to the one sent in the payload after verifying the unique code.
   */
  User.prototype.resetPassword = function(
    resetCodeModel: any,
    resetCode: string,
    newPassword: string
  ) {
    return resetCodeModel
      .findOne({
        where: {
          userId: this.id
        }
      })
      .then((code: any) => {
        if (code) {
          if (code.checkUniqueCode(resetCode)) {
            // checks whether the code sent in the payload is same as that in the database.
            return this.updatePassword(newPassword).then(() => {
              return code.markCodeInvalid(); // marks the code as invalid so that it cant be reused.
            });
          } else {
            throw Boom.badRequest(
              "Link to reset the password is no longer valid."
            );
          }
        } else {
          throw Boom.badRequest("User has not requested to reset his password");
        }
      });
  };

  User.prototype.updatePassword = function(password: string): Promise<any> {
    const pswd = User.hashPassword(password);
    return this.update({
      password: pswd
    });
  };

  User.getAllPaginatedUsers = function(
    size: number,
    page: number,
    baseUrl: string
  ): Promise<any> {
    if (size > 0 && page >= 0) {
      return User.scope(null)
        .findAndCountAll({
          order: [["createdAt", "DESC"]],
          limit: size,
          offset: page * size
        })
        .then(res => {
          let data: Array<any> = [];
          res.rows.forEach(user => {
            data.push(user.get({ plain: true }));
          });
          let totalPages = Math.ceil(res.count / size) - 1;
          if (page < totalPages) {
            // for pages other than the last page.
            return {
              noOfPages: totalPages + 1,
              currentPageNo: page + 1,
              users: data,
              next: `${baseUrl}/user?page=${page + 1}&size=${size}`
            };
          } else if (page >= totalPages) {
            // for last page and any page number that doesn't exist.
            return {
              noOfPages: totalPages + 1,
              currentPageNo: page + 1,
              users: data,
              next: null
            };
          }
        });
    } else {
      return Promise.reject(
        Boom.badRequest("Page size and page number must be greater than 0")
      );
    }
  };

  return User;
}
