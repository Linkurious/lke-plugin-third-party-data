import {PluginRouteOptions} from '@linkurious/rest-client';
import express = require('express');

import {MyPluginConfig} from '../../shared/myPluginConfig';

import {ServiceFacade} from './serviceFacade';

export const configureRoutes = (options: PluginRouteOptions<MyPluginConfig>): void => {
  const services = new ServiceFacade(options);
  options.router.use(express.json());

  // This is a middleware that will be called for every request
  options.router.use(
    respond(async (req, _res, next) => {
      const isAdmin = await services.currentUserIsAdmin(req);
      if (!isAdmin) {
        throw new Error('Unauthorized');
      }
      next();
    })
  );

  /**
   * Validate the user access rights
   */
  options.router.get(
    '/authorize',
    // It does anything because the whole logins in a middleware
    respond((_req, res) => {
      res.sendStatus(204);
    })
  );

  options.router.get(
    '/get-config',
    respond(async (req, res) => {
      // send response
      const user = await options.getRestClient(req).auth.getCurrentUser();
      if (user.isSuccess()) {
        console.log(user.body.email);
      }

      res.json(options.configuration);
    })
  );
};

function respond(
  promiseFunction: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => Promise<void> | void
): express.RequestHandler {
  return (req, res, next) => {
    Promise.resolve(promiseFunction(req, res, next)).catch((e) => {
      if (e instanceof Error) {
        res.status(500).json({error: e.name, message: e.message});
      } else {
        res.status(500).json(JSON.stringify(e));
      }
    });
  };
}
