import { IPlugin, IPluginInfo } from '../interfaces';
import * as Hapi from 'hapi';

export default (): IPlugin => {
  return {
    register: (server: Hapi.Server): Promise<any> => {
      return server.register([
        require('inert'),
        require('vision'),
        {
          plugin: require('hapi-swagger'),
          options: {
            documentationPage: process.env.NODE_ENV === 'prod' ? false : true,
            info: {
              title: 'Shree Shyam Api',
              description: 'API powering the app',
              version: '1.0.0'
            },
            securityDefinitions: {
              jwt: {
                type: 'apiKey',
                name: 'Authorization',
                in: 'header'
              }
            },
            basePath: process.env.NODE_ENV === 'prod' ? '/api' : '/',
            grouping: 'tags',
            sortEndpoints: 'ordered',
            tags: [
              {
                name: 'user',
                description: 'User related enpoints for the app.'
              },
              {
                name: 'garment',
                description: 'Garment style related enpoints for the app.'
              },
              {
                name: 'Worker',
                description: 'Worker related endpoints for the app.'
              }
            ],
            validatorUrl: null,
            schemes: ['http']
          }
        }
      ]);
    },
    info: () => {
      return {
        name: 'Swagger Documentation',
        version: '1.0.0'
      };
    }
  };
};
