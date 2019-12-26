import * as Sequelize from "sequelize";
import * as Boom from "boom";
import * as moment from "moment";

const XLSX = require("xlsx");

export default function(sequelize, DataTypes) {
  const Attendance = sequelize.define(
    "attendance",
    {
      id: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      shift: {
        type: Sequelize.STRING(70),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      comment: {
        type: Sequelize.STRING(100),
        allowNull: true
      }
    },
    {
      timestamps: true,
      paranoid: true
    }
  );

  Attendance.associate = function(models): void {
    models.attendance.belongsTo(models.user, {
      foreignKey: "userId",
      targetKey: "id"
    });
  };

  Attendance.workdone = function(
    size: number,
    page: number,
    from: any,
    to: any,
    clauses,
    models,
    baseUrl: string
  ): Promise<any> {
    const Op = Sequelize.Op;
    if (size > 0 && page >= 0) {
      return Attendance.findAndCountAll({
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: models.cutter,
            where: clauses.cutter,
            include: [
              {
                model: models.garment,
                where: clauses.garment
              }
            ]
          },
          {
            model: models.worker,
            where: clauses.worker,
            include: [
              {
                model: models.process,
                where: clauses.process
              }
            ]
          }
        ],
        where: {
          createdAt: {
            [Op.lte]: to,
            [Op.gte]: from
          }
        },
        limit: size,
        offset: page * size
      }).then(res => {
        let data: Array<any> = [];
        res.rows.forEach(garment => {
          data.push(garment.get({ plain: true }));
        });
        let totalPages = Math.ceil(res.count / size) - 1;
        if (page < totalPages) {
          // for pages other than the last page.
          return {
            noOfPages: totalPages + 1,
            currentPageNo: page + 1,
            workdone: data,
            next: `${baseUrl}/workdone?page=${page + 1}&size=${size}`
          };
        } else if (page >= totalPages) {
          // for last page and any page number that doesn't exist.
          return {
            noOfPages: totalPages + 1,
            currentPageNo: page + 1,
            workdone: data,
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

  Attendance.getworkdonexl = function(from, to, clauses, models): Promise<any> {
    const Op = Sequelize.Op;
    return Attendance.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: models.cutter,
          where: clauses.cutter,
          include: [
            {
              model: models.garment,
              where: clauses.garment
            }
          ]
        },
        {
          model: models.worker,
          where: clauses.worker,
          include: [
            {
              model: models.process,
              where: clauses.process
            }
          ]
        }
      ],
      where: {
        createdAt: {
          [Op.lte]: to,
          [Op.gte]: from
        }
      }
    }).then(workdone => {
      if (workdone.length) {
        let data = [];
        let total = 0;
        workdone.forEach((work, index) => {
          const plainwork = work.get({ plain: true });
          total += plainwork.cutter.quantity;
          data.push({
            ["S. No."]: index + 1,
            ["Style No"]: plainwork.cutter.garment.style,
            ["Bundle"]: plainwork.cutter.bundle,
            ["Quantity"]: plainwork.cutter.quantity,
            ["Size"]: plainwork.cutter.size.toUpperCase(),
            ["Color"]: plainwork.cutter.color,
            ["Name"]: plainwork.worker.name,
            ["Mobile Number"]: plainwork.worker.mobile,
            ["Process"]: plainwork.worker.process.name,
            ["Completed On"]: moment(plainwork.createdAt)
              .utcOffset(330)
              .format("DD-MM-YYYY HH:mm")
          });
        });
        data.push({
          "": `Total quantity ${total}`
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "workdone");
        const wbbuf = XLSX.write(wb, { type: "buffer" });
        return wbbuf;
      } else {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet([{}]);
        XLSX.utils.book_append_sheet(wb, ws, "workdone");
        const wbbuf = XLSX.write(wb, { type: "buffer" });
        return wbbuf;
      }
    });
  };

  Attendance.getpaymentsxl = function(
    styles,
    fromDates,
    toDates,
    processes,
    models
  ): Promise<any> {
    const fields: Array<string> = ["createdAt"];
    const Op = Sequelize.Op;
    let WorkdoneXlPromises = [];
    let data = [];
    let totalPayment = 0;
    let serialNumber = 1;
    styles.forEach((style, index) => {
      const processWhere: any = {};
      if (processes[index] !== "all") {
        processWhere.name = processes[index];
      }
      WorkdoneXlPromises.push(
        Attendance.findAll({
          attributes: fields,
          order: [["createdAt", "DESC"]],
          include: [
            {
              model: models.cutter,
              include: [
                {
                  model: models.garment,
                  where: {
                    style: style
                  },
                  include: [
                    {
                      model: models.rate
                    }
                  ]
                }
              ]
            },
            {
              model: models.worker,
              include: [
                {
                  model: models.process,
                  where: processWhere
                },
                {
                  model: models.bank
                }
              ]
            }
          ],
          where: {
            createdAt: {
              [Op.lte]: toDates[index],
              [Op.gte]: fromDates[index]
            }
          }
        }).then(workdone => {
          if (workdone.length) {
            workdone.forEach((work, index) => {
              const plainwork = work.get({ plain: true });
              if (plainwork.cutter && plainwork.worker) {
                const rate = plainwork.cutter.garment.rates.filter(
                  rate =>
                    rate.garmentId === plainwork.cutter.garmentId &&
                    rate.processId === plainwork.worker.processId
                );
                // ratePP is rate
                const ratePP = rate.length > 0 ? rate[0].rate : 0.0;
                const payment = ratePP * plainwork.cutter.quantity;
                let bankObject = {};
                if (plainwork.worker.bank) {
                  const bank = plainwork.worker.bank;
                  bankObject = {
                    "Account Holder": bank.bankName,
                    "Account Number": bank.accountNumber,
                    IFSC: bank.ifsc,
                    "Bank Name": bank.bankName,
                    Branch: bank.city
                  };
                }
                totalPayment += payment;
                data.push({
                  ["S. No."]: serialNumber,
                  ["Name"]: plainwork.worker.name,
                  ["Mobile Number"]: plainwork.worker.mobile,
                  ["Style No"]: plainwork.cutter.garment.style,
                  ["Quantity"]: plainwork.cutter.quantity,
                  ["Bundle"]: plainwork.cutter.bundle,
                  ["Process"]: plainwork.worker.process.name,
                  ["Rate per piece"]: ratePP,
                  ["Size"]: plainwork.cutter.size.toUpperCase(),
                  ["Color"]: plainwork.cutter.color,
                  ["Completed On"]: moment(plainwork.createdAt)
                    .utcOffset(330)
                    .format("DD-MM-YYYY HH:mm"),
                  ["Payment"]: payment,
                  ...bankObject
                });
                serialNumber++;
              }
            });
            // data.push({
            //   "": `Total Payment due for ${style} is ${totalPayment}`
            // });

            data.push({
              "": ""
            });

            return data;
          } else {
            return [{}];
          }
        })
      );
    });

    return Promise.all(WorkdoneXlPromises).then(values => {
      const wb = XLSX.utils.book_new();
      data.push({
        "": `Total Payment due  is ${totalPayment}`
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "paymets");
      const wbbuf = XLSX.write(wb, { type: "buffer" });
      return wbbuf;
    });
  };

  return Attendance;
}
