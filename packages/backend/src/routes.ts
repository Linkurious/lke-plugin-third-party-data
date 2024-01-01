import {PluginRouteOptions} from '@linkurious/rest-client';
import express = require('express');

import {MyPluginConfig} from '../../shared/myPluginConfig';

import {ServiceFacade} from './services/serviceFacade';
import {SearchOptions} from './models/searchOptions';

export const configureRoutes = (options: PluginRouteOptions<MyPluginConfig>): void => {
  const services = new ServiceFacade(options);
  options.router.use(express.json());

  options.router.get(
    '/admin-config',
    respond(async () => {
      return services.getConfigAdmin();
    })
  );

  options.router.get(
    '/config',
    respond(async () => {
      return services.getConfigUser();
    })
  );

  options.router.get(
    '/search',
    respond(async (req) => {
      const searchOptions = SearchOptions.from(req.query);
      return services.search(options.getRestClient(req), searchOptions);
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
