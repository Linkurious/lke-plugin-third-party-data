import {PluginRouteOptions, RestClient} from '@linkurious/rest-client';
import * as express from 'express';

import {MyPluginConfig} from '../../../shared/myPluginConfig';
import {Logger, WithLogger} from '../services/logger';

interface PluginOptions extends PluginRouteOptions<MyPluginConfig> {
  parentProcess?: PluginParentProcess;
}

export interface PluginParentProcess {
  postMetadata(metadata: PluginMetadata): void;
}

export interface PluginMetadata {
  actions: PluginAction[];
}

export interface PluginAction {
  name: string;
  urlTemplate: string;
  sourceKey?: string;
  access: 'admin' | '*';
}

export class API extends WithLogger {
  private readonly options: PluginRouteOptions<MyPluginConfig>;
  readonly parentProcess?: PluginParentProcess;

  constructor(options: PluginOptions, logger: Logger) {
    super(logger);
    this.options = options;
    this.parentProcess = options.parentProcess;
  }

  server(req: express.Request): RestClient {
    return this.options.getRestClient(req);
  }
}
