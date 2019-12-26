import { IPlugin, IPluginOptions } from '../interfaces';
import * as Hapi from 'hapi';
// import { IUser, UserModel } from "../../users/user";

export default (): IPlugin => {
  return {
    register: (server: Hapi.Server, options: IPluginOptions): Promise<void> => {
      return server.register({
        plugin: require('hapi-authorization'),
        options: {
          roles: ['GOD', 'JESUS', 'ROMANS']
        }
      });
    },
    info: () => {
      return {
        name: 'ACL :D',
        version: '1.0.0'
      };
    }
  };
};
