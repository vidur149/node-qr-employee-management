import * as Hapi from "hapi";
import * as Boom from "boom";
import { IServerConfigurations } from "../config";
import { IDb } from "../config";
export default class GarmentsController {
  private configs: IServerConfigurations;
  private database: IDb;

  constructor(configs: IServerConfigurations, database: IDb) {
    this.database = database;
    this.configs = configs;
  }

  public createBankAccount(request: Hapi.Request, reply: Hapi.Base_Reply) {
    return this.database.bank
      .create(request.payload)
      .then((account: any) => {
        return reply.response(account).code(201);
      })
      .catch(err => {
        if (err.parent.errno === 1062) {
          throw Boom.conflict(
            "Bank account with the given details already exists"
          );
        } else if (err.parent.errno === 1452) {
          throw Boom.badRequest("Worker doesnt exist");
        } else {
          throw Boom.boomify(err);
        }
      });
  }

  public getBankAccounts(request: Hapi.Request, reply: Hapi.Base_Reply) {
    const bankName = request.query.name;
    const accountNumber = request.query.accountNumber;
    const whereclause: any = {};
    bankName ? (whereclause.bankName = bankName) : null;
    accountNumber ? (whereclause.accountNumber = accountNumber) : null;

    return this.database.bank
      .getAccounts(
        request.query.size,
        request.query.page,
        whereclause,
        this.database.worker,
        this.configs.baseUrl
      )
      .then((response: any) => {
        return reply.response(response);
      })
      .catch(err => Boom.boomify(err));
  }

  public deleteBankAccount(request: Hapi.Request, reply: Hapi.Base_Reply) {
    const { id } = request.params;
    return this.database.bank
      .findOne({
        where: {
          id: id
        }
      })
      .then((bank: any) => {
        if (bank) {
          return bank.destroy();
        } else {
          throw Boom.badRequest('Bank account doesn"t exist');
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
