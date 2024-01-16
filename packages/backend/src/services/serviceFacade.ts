import {PluginRouteOptions, RestClient} from '@linkurious/rest-client';
import express = require('express');

import {MyPluginConfig, MyPluginConfigPublic} from '../../../shared/myPluginConfig';
import {API} from '../server/api';
import {
  ApiError,
  VendorSearchResponse,
  VendorResult,
  VendorDetailsResponse
} from '../../../shared/api/response';
import {SearchOptions} from '../models/searchOptions';
import {asError} from '../../../shared/utils';
import {DetailsOptions} from '../models/detailsOptions';

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
    this.logger.info('ServiceFacade initialized');
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
    let results: VendorResult[] = [];
    let apiError: ApiError | undefined = undefined;
    const searcher = new Searcher(this.logger, this.config, searchOptions.integrationId);
    try {
      results = await searcher.getSearchResults(restClient, searchOptions);
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

  async getDetails(detailsOptions: DetailsOptions): Promise<VendorDetailsResponse> {
    let result: VendorResult | undefined = undefined;
    let apiError: ApiError | undefined = undefined;
    const searcher = new Searcher(this.logger, this.config, detailsOptions.integrationId);
    try {
      result = await searcher.getDetails(detailsOptions);
    } catch (e) {
      apiError = {
        code: 'get-details-error',
        message: asError(e).message
      };
    }
    return {
      error: apiError,
      integrationId: detailsOptions.integrationId,
      searchResultId: detailsOptions.searchResultId,
      vendorKey: searcher.integration.vendor.key,
      result: result
    };
  }
}
