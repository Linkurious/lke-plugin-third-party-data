import {PluginRouteOptions, RestClient} from '@linkurious/rest-client';
import express = require('express');

import {MyPluginConfig, MyPluginConfigPublic} from '../../../shared/myPluginConfig';
import {API} from '../server/api';
import {ApiError, VendorSearchResponse, VendorSearchResult} from '../../../shared/api/response';
import {SearchOptions} from '../models/searchOptions';
import {asError} from '../../../shared/utils';

import {Configuration} from './configuration';
import {Logger} from './logger';
import {Searcher} from './vendor/searcher';

export class ServiceFacade {
  private readonly logger: Logger;
  public readonly api: API;
  public config: Configuration;

  constructor(options: PluginRouteOptions<MyPluginConfig>) {
    this.logger = new Logger();
    this.config = new Configuration(options.configuration, this.logger);
    this.api = new API(options, this.logger);
  }

  async currentUserIsAdmin(req: express.Request): Promise<boolean> {
    const user = await this.api.server(req).auth.getCurrentUser();
    if (user.isSuccess()) {
      return !!user.body.groups.find((g) => g.name === 'admin');
    }
    return false;
  }

  async getConfigAdmin(): Promise<MyPluginConfig> {
    return this.config.config;
  }

  async getConfigUser(): Promise<MyPluginConfigPublic> {
    return this.config.getPublicConfig();
  }

  async search(
    restClient: RestClient,
    searchOptions: SearchOptions
  ): Promise<VendorSearchResponse> {
    let results: VendorSearchResult[] = [];
    let apiError: ApiError | undefined = undefined;
    const searcher = new Searcher(this.config, searchOptions);
    try {
      results = await searcher.getSearchResults(restClient);
    } catch (e) {
      apiError = {
        code: 'search-error',
        message: asError(e).message
      };
    }
    return {
      inputNodeId: searchOptions.nodeId,
      error: apiError,
      integrationId: searchOptions.integrationId,
      vendorKey: searcher.integration.vendor.key,
      results: results
    };
  }
}
