import * as Hapi from "hapi";
import * as Joi from "joi";

import { IServerConfigurations } from "../config";
import UserController from "./user-controller";
import { userSchema } from "./schemas";
import { roles, MD, ACCOUNTS } from "../constants";

export default function(
  server: Hapi.Server,
  serverConfigs: IServerConfigurations,
  database: any
) {
  const userController = new UserController(serverConfigs, database);
  server.bind(userController);
  server.route({
    method: "POST",
    path: "/user",
    handler: userController.signup,
    config: {
      description: "Create a new account",
      notes: `Creates a new user account with the details passed in the payload. 
                No authorisation header required to access this endpoint.`,
      // auth: "jwt",
      validate: {
        payload: Joi.object({
          name: Joi.string()
            .required()
            .description("Name of the user"),
          role: Joi.string()
            .valid([...roles])
            .required()
            .description("Role in the organization"),
          password: Joi.string()
            .required()
            .description("Password of the user"),
          mobile1: Joi.number()
            .positive()
            .max(9999999999)
            .required()
            .description("Mobile number of the worker"),
          mobile2: Joi.number()
            .positive()
            .max(9999999999)
            .description("Alternative number of the worker"),
          dob: Joi.date().required(),
          address: Joi.string().required(),
          city: Joi.string().required(),
          state: Joi.string().required(),
          morning: Joi.boolean(),
          evening: Joi.boolean(),
          night: Joi.boolean()
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
              description: "New User Created Successfully."
            },
            "409": {
              description: "User with the given name already exist."
            }
          },
          order: 1
        }
        // hapiAuthorization: {
        //   roles: ['GOD']
        // }
      },
      tags: ["api", "user"]
    }
  });

  server.route({
    method: "POST",
    path: "/user/login",
    handler: userController.login,
    config: {
      description: "Returns a JWT for the user after a successfull login",
      notes: [
        `This endpoint will return a JWT, generated on the basis of user role that will 
            be used as the value of authorisation header for making requests to protected endpoint.
            
            Also, it will return user information.
            
            No authorisation header required to access this endpoint.`
      ],
      validate: {
        payload: Joi.object({
          name: Joi.string()
            .required()
            .description("name of the user"),
          password: Joi.string()
            .required()
            .description("Password of the user")
        })
      },
      response: {
        schema: Joi.object({
          jwt: Joi.string()
            .required()
            .description(
              "The api_key that will be used to authenticate all the future requests."
            ),
          user: userSchema
        })
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Successfully authenticated."
            },
            "401": {
              description: "Name or password is incorrect."
            }
          },
          order: 2
        }
      },
      tags: ["api", "user"]
    }
  });

  server.route({
    method: "POST",
    path: "/user/photo",
    handler: userController.uploadPhoto,
    config: {
      description:
        "Upload a photo to aws s3",
      notes: `You can upload an image(.png, .jpg, .gif) file.
        After successfull upload it will return the link details.
        File size is limited to a max of 100 MBs.  
        `,
      auth: "jwt",
      payload: {
        output: "stream",
        parse: true,
        maxBytes: 102400000,
        allow: "multipart/form-data"
      },
      validate: {
        payload: {
          file: Joi.any()
            .required()
            .meta({ swaggerType: "file" })
            .description("The file which needs to be uploaded.")
        }
      },
      response: {
        schema: Joi.object({
          mediaUri: Joi.string().uri()
        })
      },
      plugins: {
        "hapi-swagger": {
          payloadType: "form",
          responses: {
            "201": {
              description:
                "Successfully uploaded the profile photo and returned the uri."
            },
            "400": {
              description: "file type not supported"
            }
          },
          order: 6
        },
        hapiAuthorization: { roles: roles }
      },
      tags: ["api", "user"]
    }
  });

  server.route({
    method: "POST",
    path: "/user/requestResetPassword",
    handler: userController.requestResetPassword,
    config: {
      description: "Returns the code necessary to reset the password",
      notes: [
        `Returns the reset code that will be used by a user to reset his/her password.

            No authorisation header required to access this endpoint.
            `
      ],
      validate: {
        payload: Joi.object({
          name: Joi.string().required()
        })
      },
      response: {
        // schema: Joi.object({
        //     "success": Joi.boolean().required()
        // })
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Reset code sent"
            }
          },
          order: 3
        }
      },
      tags: ["api", "user"]
    }
  });

  server.route({
    method: "POST",
    path: "/user/resetPassword",
    handler: userController.resetPassword,
    config: {
      description:
        "Resets the password of the user and updates it with the password in the payload",
      notes: `This endpoint will compare the value of unique code in the payload with
            the code at server side and will update the password if the values match.
            
            No authorisation header required to access this endpoint.`,
      validate: {
        payload: Joi.object({
          code: Joi.string()
            .required()
            .description("Unique Code"),
          password: Joi.string()
            .required()
            .description("New Password"),
          name: Joi.string()
            .required()
            .description("Your user name")
        })
      },
      response: {
        schema: Joi.object({
          reset: Joi.boolean().required()
        })
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Successfully changed the password"
            },
            "400": {
              description: "Code has expired."
            }
          },
          order: 4
        }
      },
      tags: ["api", "user"]
    }
  });

  server.route({
    method: "GET",
    path: "/user",
    handler: userController.getCompleteProfile,
    config: {
      description: `GET user details`,
      auth: "jwt",
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Details of user returned successfully"
            }
          }
        },
        hapiAuthorization: {
          roles
        }
      },
      tags: ["api", "user"]
    }
  });

  server.route({
    method: "GET",
    path: "/user/{id}",
    handler: userController.getCompleteProfile,
    config: {
      description: `GET user details`,
      auth: "jwt",
      validate: {
        params: {
          id: Joi.number()
            .required()
            .description("Id of the user")
        }
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Details of user returned successfully"
            }
          }
        },
        hapiAuthorization: {
          roles: [MD, ACCOUNTS]
        }
      },
      tags: ["api", "user"]
    }
  });

  server.route({
    method: "GET",
    path: "/users",
    handler: userController.getUsers,
    config: {
      description: "GET details of all the users",
      notes: `It will return the list of all users (with pagination).   
        You have to pass the page size(Number of records in one page) and page number in query params.  

        GOD can access this endpoint.`,
      auth: "jwt",
      validate: {
        query: {
          page: Joi.number().required(),
          size: Joi.number().required()
        }
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "List of all users returned successfully"
            }
          },
          order: 2
        },
        hapiAuthorization: {
          roles: ["GOD"]
        }
      },
      tags: ["api", "user"]
    }
  });

  server.route({
    method: "DELETE",
    path: "/user/{id}",
    handler: userController.deleteUser,
    config: {
      description: "DELETE user",
      validate: {
        params: {
          id: Joi.number()
            .required()
            .description("Id of the user")
        }
      },
      auth: "jwt",
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "User successfully deleted."
            }
          },
          order: 10
        },
        hapiAuthorization: {
          roles: ["GOD"]
        }
      },
      tags: ["api", "user"]
    }
  });
}
