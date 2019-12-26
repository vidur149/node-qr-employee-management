import * as nconf from "nconf";
import * as path from "path";
import * as Sequelize from "sequelize";

//Read Configurations
const configs = new nconf.Provider({
  env: true,
  argv: true,
  store: {
    type: "file",
    file: path.join(__dirname, `./config.${process.env.NODE_ENV}.json`)
  }
});

export interface AWS {
  bucket: string;
  keyId: string;
  secret: string;
}

export interface IServerConfigurations {
  port: number;
  plugins: Array<string>;
  jwtSecret: string;
  jwtExpiration: string;
  baseUrl: string;
  aws: AWS;
}

interface User extends Sequelize.Model<any, any, any> {
  getAllPaginatedUsers: (
    size: number,
    page: number,
    url: string
  ) => Promise<any>;
  uploadPhoto: (file: any, aws: AWS, id: number) => Promise<any>;
}

export interface IDb {
  sequelize: any;
  user: User;
  attendance: Sequelize.Model<any, any, any>;
  Sequelize: any;
  worker: any;
  cutter: any;
  rate: any;
  process: any;
  workdone: any;
  bank: any;
  garment: any;
  resetCode: any;
  stitchingbodyreceive: any;
  stitchingbodyissue: any;
  stitchingastarreceive: any;
  stitchingastarissue: any;
  process2issue: any;
  process4issue: any;
  process9issue: any;
  finishingreceive: any;
  finishingissue: any;
}

export function getServerConfigs(): IServerConfigurations {
  return configs.get("server");
}
