import {PluginRouteOptions} from '@linkurious/rest-client';
import express = require('express');

import {MyPluginConfig} from '../../shared/myPluginConfig';

import {Logger} from './logger';
import {Configuration} from './configuration';
import {API} from './api';

export class ServiceFacade {
  private readonly logger: Logger;
  public readonly api: API;
  constructor(options: PluginRouteOptions<MyPluginConfig>) {
    this.logger = new Logger();
    Configuration.validate(options.configuration, this.logger);
    this.api = new API(options, this.logger);
  }

  async currentUserIsAdmin(req: express.Request): Promise<boolean> {
    const user = await this.api.server(req).auth.getCurrentUser();
    if (user.isSuccess()) {
      return !!user.body.groups.find((g) => g.name === 'admin');
    }
    return false;
  }
}
