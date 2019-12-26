import { IPlugin } from '../interfaces';
import * as Hapi from 'hapi';

export default (): IPlugin => {
  return {
    register: (server: Hapi.Server): Promise<any> => {
      const opts = {
        reporters: {
          myConsoleReporter: [
            {
              module: 'good-squeeze',
              name: 'Squeeze',
              args: [{ error: '*', response: '*', log: '*', request: '*' }]
            },
            {
              module: 'good-console'
            },
            'stdout'
          ]
        }
      };
      return server.register({
        plugin: require('good'),
        options: opts
      });
    },
    info: () => {
      return {
        name: 'Good Logger',
        version: '1.0.0'
      };
    }
  };
};
