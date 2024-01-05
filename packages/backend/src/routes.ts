import {PluginInterface} from '@linkurious/rest-client';
import express from 'express';

import {MyPluginConfig} from '../../shared/myPluginConfig';

import {ServiceFacade} from './services/serviceFacade';
import {SearchOptions} from './models/searchOptions';

export = function (pluginInterface: PluginInterface<MyPluginConfig>): void {
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
