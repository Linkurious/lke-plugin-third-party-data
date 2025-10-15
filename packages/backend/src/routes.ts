import {PluginRouteOptions} from '@linkurious/rest-client';
import express from 'express';

import {MyPluginConfig} from '../../shared/myPluginConfig';
import {ApiResponse} from '../../shared/api/response';

import {ServiceFacade} from './services/serviceFacade';
import {SearchOptions} from './models/searchOptions';
import {DetailsOptions} from './models/detailsOptions';

export = function (pluginInterface: PluginRouteOptions<MyPluginConfig>): void {
  const services = new ServiceFacade(pluginInterface);

  pluginInterface.router.get(
    '/admin-config',
    respond(async (req) => {
      return services.getConfigAdmin(req);
    })
  );

  /*
  pluginInterface.router.post(
    '/admin-config',
    respond(async (req) => {
      return services.setConfigAdmin(req.body);
    })
  );
   */

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
  handler: (req: express.Request) => Promise<ApiResponse>,
  successStatus = 200
): express.RequestHandler {
  return (req, res) => {
    Promise.resolve(handler(req))
      .then((response) => {
        if (response.error) {
          res.status(500);
        } else {
          res.status(successStatus);
        }
        res.json(response);
      })
      .catch((e) => {
        const response: ApiResponse = {};
        if (e instanceof Error) {
          response.error = {code: e.name, message: e.message};
        } else {
          response.error = {code: 'unexpected', message: JSON.stringify(e)};
        }
        res.status(500).json(response);
      });
  };
}
