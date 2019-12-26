import * as Hapi from "hapi";
import * as Joi from "joi";

import { IServerConfigurations } from "../config";
import BankController from "./bank-controller";
import { roles } from "../constants";

export default function(
  server: Hapi.Server,
  serverConfigs: IServerConfigurations,
  database: any
) {
  const bankController = new BankController(serverConfigs, database);
  server.bind(bankController);

  server.route({
    method: "POST",
    path: "/bank",
    handler: bankController.createBankAccount,
    config: {
      description: "Create a new bank account for an exisisting worker",
      notes: `Assign a new bank account to a worker with the details passed in the payload.  

                Onl or god can create a worker.`,
      auth: "jwt",
      validate: {
        payload: Joi.object({
          userId: Joi.number()
            .required()
            .description("Id of the worker"),
          city: Joi.string()
            .required()
            .description("City of the bank account"),
          ifsc: Joi.string()
            .required()
            .description("IFSC code for the bank account"),
          accountName: Joi.string()
            .required()
            .description("Name of the account holder"),
          bankName: Joi.string()
            .required()
            .description("Name of the bank"),
          accountNumber: Joi.number()
            .required()
            .description("Account number of the bank account"),
          itr1: Joi.string().required(),
          aadhar: Joi.string().required(),
          itr2: Joi.string()
        })
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "New bank account added Successfully."
            },
            "409": {
              description:
                "User already has a bank account assosciated with him."
            }
          },
          order: 1
        },
        hapiAuthorization: {
          roles
        }
      },
      tags: ["api", "bank"]
    }
  });

  server.route({
    method: "GET",
    path: "/bank",
    handler: bankController.getBankAccounts,
    config: {
      description: "GET details of all the bank accounts",
      notes: `It will return the list of all bank accounts`,
      auth: "jwt",
      validate: {
        query: {
          page: Joi.number().required(),
          size: Joi.number().required(),
          name: Joi.string().description("name of the bank account"),
          accountNumber: Joi.number()
            .positive()
            .description("Account number of the bank account")
        }
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "List of all bank accounts returned successfully"
            }
          },
          order: 2
        },
        hapiAuthorization: {
          roles: ["GOD"]
        }
      },
      tags: ["api", "bank"]
    }
  });

  server.route({
    method: "DELETE",
    path: "/bank/{id}",
    handler: bankController.deleteBankAccount,
    config: {
      description: "DELETE bank account of the worker",
      validate: {
        params: {
          id: Joi.number()
            .required()
            .description("Id of the bank account you want to delete")
        }
      },
      auth: "jwt",
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Bank account successfully deleted."
            }
          },
          order: 3
        },
        hapiAuthorization: {
          roles: ["GOD"]
        }
      },
      tags: ["api", "bank"]
    }
  });
}
