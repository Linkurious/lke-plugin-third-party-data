import {PluginRouteOptions} from '@linkurious/rest-client';
import express from 'express';

import {MyPluginConfig} from '../../shared/myPluginConfig';

import {ServiceFacade} from './services/serviceFacade';
import {SearchOptions} from './models/searchOptions';
import {DetailsOptions} from './models/detailsOptions';

export = function (pluginInterface: PluginRouteOptions<MyPluginConfig>): void {
  const services = new ServiceFacade(pluginInterface);

  pluginInterface.router.get(
    '/admin-config',
    respond(async () => {
      return services.getConfigAdmin();
    })
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
  handler: (req: express.Request) => Promise<unknown>,
  successStatus = 200
): express.RequestHandler {
  return (req, res) => {
    Promise.resolve(handler(req))
      .then((response) => {
        res.status(successStatus);
        res.json(response);
      })
      .catch((e) => {
        if (e instanceof Error) {
          res.status(500).json({error: e.name, message: e.message});
        } else {
          res.status(500).json({error: 'unexpected', message: JSON.stringify(e)});
        }
      });
  };
}
