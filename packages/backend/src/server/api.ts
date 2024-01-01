import {PluginRouteOptions, RestClient} from '@linkurious/rest-client';
import * as express from 'express';

import {MyPluginConfig} from '../../../shared/myPluginConfig';
import {Logger, WithLogger} from '../services/logger';

export class API extends WithLogger {
  private readonly options: PluginRouteOptions<MyPluginConfig>;

  constructor(options: PluginRouteOptions<MyPluginConfig>, logger: Logger) {
    super(logger);
    this.options = options;
  }

  server(req: express.Request): RestClient {
    return this.options.getRestClient(req);
  }
}
