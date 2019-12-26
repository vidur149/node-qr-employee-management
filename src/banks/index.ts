import * as Hapi from "hapi";
import Routes from "./routes";
import { IServerConfigurations } from "../config";

export const BanksInit = (
  server: Hapi.Server,
  configs: IServerConfigurations,
  database: any
) => {
  Routes(server, configs, database);
};
