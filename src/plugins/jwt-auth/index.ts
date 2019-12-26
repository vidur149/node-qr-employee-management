import { IPlugin, IPluginOptions } from '../interfaces';
import * as Hapi from 'hapi';

export default (): IPlugin => {
  return {
    register: (server: Hapi.Server, options: IPluginOptions): Promise<void> => {
      return server.register(require('hapi-auth-jwt2'));
    },
    info: () => {
      return {
        name: 'JWT Authentication',
        version: '1.0.0'
      };
    }
  };
};
