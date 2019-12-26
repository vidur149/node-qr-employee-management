import * as Server from "./server";
import * as Configs from "./config";
import * as Hapi from "hapi";
import { dbInit } from "./models";

if (process.env.NODE_ENV) {
  const database = dbInit();
  console.log(`Running enviroment ${process.env.NODE_ENV}`);
  const serverConfigs = Configs.getServerConfigs();
  //Starting Application Server
  Server.init(serverConfigs, database).then((server: Hapi.Server) => {
    server.start(() => {
      console.log("Server running at:", server.info.uri);
    });
  });
} else {
  throw Error('Set NODE_ENV to "dev", "staging" or "prod".');
}
