import {PluginRouteOptions} from '@linkurious/rest-client';
import express from 'express';

import {MyPluginConfig} from '../../shared/myPluginConfig';
import {ApiResponse} from '../../shared/api/response';

import {ServiceFacade} from './services/serviceFacade';
import {SearchOptions} from './models/searchOptions';
import {DetailsOptions} from './models/detailsOptions';
import {ConfigOptions} from './models/configOptions';
import {asError} from '../../shared/utils';

export = function (pluginInterface: PluginRouteOptions<MyPluginConfig>): void {
  const services = new ServiceFacade(pluginInterface);
  pluginInterface.router.use(express.json());

  // read the admin config
  pluginInterface.router.get(
    '/admin-config',
    respond(async (req) => {
      return services.getConfigAdmin(req);
    })
  );

  // update the admin config
  pluginInterface.router.post(
    '/admin-config',
    respond(async (req: express.Request) => {
      const config = ConfigOptions.from(req.body);
      return services.setConfigAdmin(req, config);
    }, 201)
  );

  pluginInterface.router.get(
    '/config',
    respond(async () => {
      return services.getConfigUser();
    })
  );

  pluginInterface.router.get(
    '/search',
    respond(async (req) => {
      const searchOptions = SearchOptions.from(req.query);
      return services.search(pluginInterface.getRestClient(req), searchOptions);
    })
  );

  pluginInterface.router.get(
    '/details',
    respond(async (req) => {
      const detailsOptions = DetailsOptions.from(req.query);
      return services.getDetails(detailsOptions);
    })
  );
};

function respond(
  handler: (req: express.Request) => Promise<ApiResponse | undefined>,
  successStatus = 200
): express.RequestHandler {
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
