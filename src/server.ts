import * as Hapi from "hapi";
import { IPlugin } from "./plugins/interfaces";
import { IServerConfigurations } from "./config";
import * as Documetation from "./documentation";
import { BanksInit } from "./banks";
import * as Users from "./users";
import { AttendanceInit } from "./attendance";

// import * as Workers from "./workers";
// import * as Garments from "./garments";
// import * as Works from "./works";
// import * as Cutter from "./cutter";
// import * as Rates from "./rates";
// import * as Banks from "./banks";
// import * as StitchingBody from "./stitchingbody";
// import * as StitchingAstar from "./stitchingastar";
// import * as Process2 from "./process2";
// import * as Process4 from "./process4";
// import * as Process9 from "./process9";
// import * as Finishing from "./finishing";

export function init(
  configs: IServerConfigurations,
  database: any
): Promise<Hapi.Server> {
  return new Promise<Hapi.Server>(resolve => {
    const port = process.env.port || configs.port;
    const server = new Hapi.Server({
      port: port,
      routes: {
        validate: {
          failAction: (request, h, err) => {
            throw err;
          }
        },
        cors: {
          headers: [
            "Accept",
            "Authorization",
            "Content-Type",
            "If-None-Match",
            "Accept-language"
          ]
        }
      },
      debug: { request: ["error"] }
    });

    //  Setup Hapi Plugins
    const plugins: Array<string> = configs.plugins;
    const pluginOptions = {
      database: database,
      serverConfigs: configs
    };

    let pluginPromises = [];

    plugins.forEach((pluginName: string) => {
      var plugin: IPlugin = require("./plugins/" + pluginName).default();
      console.log(
        `Register Plugin ${plugin.info().name} v${plugin.info().version}`
      );
      pluginPromises.push(plugin.register(server, pluginOptions));
    });

    // Add role and userId to the request lifecycle
    const validateUser = async function(
      decoded: { id: any; role: string; active: boolean },
      request: Hapi.Request
    ) {
      if (decoded.id && decoded.role && decoded.active) {
        return {
          isValid: true
        };
      } else {
        return {
          isValid: false
        };
      }
    };

    // Register all the routes once all plugins have been initialized
    Promise.all(pluginPromises)
      .then(() => {
        server.auth.strategy("jwt", "jwt", {
          key: configs.jwtSecret,
          validate: validateUser,
          verifyOptions: { algorithms: ["HS256"] }
        });

        // Configured handlebars as the template engine.
        // I have made a custom template for swagger using handlebars.
        if (process.env.NODE_ENV === "dev") {
          server.views({
            path: "src/templates",
            engines: { html: require("handlebars") },
            isCached: false
          });
        }
        Users.init(server, configs, database);
        AttendanceInit(server, configs, database);
        BanksInit(server, configs, database);
        // Banks.init(server, configs, database);
        // Garments.init(server, configs, database);
        // Rates.init(server, configs, database);
        // Cutter.init(server, configs, database);
        // StitchingBody.init(server, configs, database);
        // StitchingAstar.init(server, configs, database);
        // Works.init(server, configs, database);
        // Process2.init(server, configs, database);
        // Process4.init(server, configs, database);
        // Process9.init(server, configs, database);
        // Finishing.init(server, configs, database);

        if (process.env.NODE_ENV === "dev") {
          Documetation.init(server, configs, database);
        }
        resolve(server);
      })
      .catch(err => console.log(err));
  });
}
