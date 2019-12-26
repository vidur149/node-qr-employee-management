import * as Sequelize from "sequelize";
import * as Boom from "boom";

export default function(sequelize, DataTypes) {
  let Bank = sequelize.define("bank", {
    id: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    accountNumber: {
      type: Sequelize.BIGINT(18),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    bankName: {
      type: Sequelize.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    accountName: {
      type: Sequelize.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    ifsc: {
      type: Sequelize.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    city: {
      type: Sequelize.STRING(150),
      allowNull: false,
      defaultValue: false
    },
    itr1: {
      type: Sequelize.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    itr2: {
      type: Sequelize.STRING(150),
      allowNull: true
    },
    aadhar: {
      type: Sequelize.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    }
  });

  Bank.getAccounts = function(
    size: number,
    page: number,
    whereclause,
    workerModel,
    baseUrl: string
  ): Promise<any> {
    if (size > 0 && page >= 0) {
      return Bank.findAndCountAll({
        order: [["createdAt", "DESC"]],
        limit: size,
        offset: page * size,
        where: whereclause
      })
        .then(res => {
          let data: Array<any> = [];
          res.rows.forEach(worker => {
            data.push(worker.get({ plain: true }));
          });
          let totalPages = Math.ceil(res.count / size) - 1;
          if (page < totalPages) {
            // for pages other than the last page.
            return {
              noOfPages: totalPages + 1,
              currentPageNo: page + 1,
              accounts: data,
              next: `${baseUrl}/bank?page=${page + 1}&size=${size}`
            };
          } else if (page >= totalPages) {
            // for last page and any page number that doesn't exist.
            return {
              noOfPages: totalPages + 1,
              currentPageNo: page + 1,
              accounts: data,
              next: null
            };
          }
        })
        .then(res => {
          let workerPromises = [];
          if (res.accounts.length) {
            res.accounts.forEach(account => {
              const workerId = account.workerId;
              workerPromises.push(
                workerModel
                  .findOne({
                    where: {
                      id: workerId
                    }
                  })
                  .then((worker: any) => {
                    return worker.get({ plain: true });
                  })
              );
            });
          }
          return Promise.all(workerPromises)
            .then(workers => {
              if (res.accounts.length) {
                res.accounts.forEach(
                  (account, index) => (account.worker = workers[index])
                );
              }
              return res;
            })
            .catch(err => err);
        });
    } else {
      return Promise.reject(
        Boom.badRequest("Page size and page number must be greater than 0")
      );
    }
  };

  return Bank;
}
