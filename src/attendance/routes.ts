import * as Hapi from "hapi";
import * as Joi from "joi";

import { IServerConfigurations } from "../config";
import { AttendanceController } from "./attendance-controller";

import { PLANT_HEAD, MD, SCANNER } from "../constants";

export default function(
  server: Hapi.Server,
  serverConfigs: IServerConfigurations,
  database: any
) {
  const controller = new AttendanceController(serverConfigs, database);
  server.bind(controller);
  server.route({
    method: "POST",
    path: "/attendance",
    handler: controller.markPresent,
    config: {
      description: "Marks attendance of an user",
      notes: `Only scanner and admin role can mark the attendance`,
      auth: "jwt",
      validate: {
        payload: Joi.object({
          userId: Joi.number()
            .required()
            .description("UserId of the user"),
          comment: Joi.string().description("Comment if required")
        })
      },
      response: {
        schema: Joi.object({
          success: Joi.boolean().required()
        })
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Marked present."
            },
            "409": {
              description: "Already marked present."
            }
          },
          order: 1
        },
        hapiAuthorization: {
          roles: [PLANT_HEAD, MD, SCANNER]
        }
      },
      tags: ["api", "attendance"]
    }
  });
}
