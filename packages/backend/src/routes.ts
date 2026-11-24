import {PluginRouteOptions} from '@linkurious/rest-client';
import type {Request, RequestHandler} from 'express';
import bodyParser from 'body-parser';

import {MyPluginConfig} from '../../shared/myPluginConfig';
import {ApiResponse} from '../../shared/api/response';
import {asError} from '../../shared/utils';

import {ServiceFacade} from './services/serviceFacade';
import {SearchOptions} from './models/searchOptions';
import {DetailsOptions} from './models/detailsOptions';
import {ConfigOptions} from './models/configOptions';
import {TestConnectionOptions} from './models/testConnectionOptions';

export = function (pluginInterface: PluginRouteOptions<MyPluginConfig>): void {
  const services = new ServiceFacade(pluginInterface);
  pluginInterface.router.use(bodyParser.json());

  // read the admin config
  pluginInterface.router.get(
    '/admin-config',
    respond(async (req) => {
      return await services.getConfigAdmin(req);
    })
  );

  // update the admin config
  pluginInterface.router.post(
    '/admin-config',
    respond(async (req: Request) => {
      const config = ConfigOptions.from(req.body);
      return await services.setConfigAdmin(req, config);
    }, 201)
  );

  pluginInterface.router.get(
    '/config',
    respond(async () => {
      return await services.getConfigUser();
    })
  );

  pluginInterface.router.get(
    '/test-connection',
    respond(async (req: Request) => {
      const testConnectionOptions = TestConnectionOptions.from(req.query);
      return await services.testConnection(req, testConnectionOptions);
    }, 200)
  );

  pluginInterface.router.get(
    '/search',
    respond(async (req) => {
      const searchOptions = SearchOptions.from(req.query);
      return await services.search(pluginInterface.getRestClient(req), searchOptions);
    })
  );

  pluginInterface.router.get(
    '/details',
    respond(async (req) => {
      const detailsOptions = DetailsOptions.from(req.query);
      return await services.getDetails(pluginInterface.getRestClient(req), detailsOptions);
    })
  );
};

function respond(
  handler: (req: Request) => Promise<ApiResponse | undefined>,
  successStatus = 200
): RequestHandler {
  return (req, res) => {
    Promise.resolve(handler(req))
      .then((response) => {
        if (response && response.error) {
          res.status(500);
        } else {
          res.status(successStatus);
        }
        res.json(response);
      })
      .catch((e) => {
        const response: ApiResponse = {};
        if (e instanceof Error) {
          console.error(e.stack);
          response.error = {code: e.name, message: e.message};
        } else {
          response.error = {code: 'unexpected', message: asError(e).message};
        }
        res.status(500).json(response);
      });
  };
}
