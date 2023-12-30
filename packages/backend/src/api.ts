import * as lke from '@linkurious/rest-client';
import * as express from 'express';

import {MyPluginConfig} from '../../shared/myPluginConfig';

import {Logger, WithLogger} from './logger';

export class API extends WithLogger {
  private readonly options: lke.PluginRouteOptions<MyPluginConfig>;

  constructor(options: lke.PluginRouteOptions<MyPluginConfig>, logger: Logger) {
    super(logger);
    this.options = options;
  }

  server(req: express.Request): lke.RestClient {
    return this.options.getRestClient(req);
  }

  /*
   * Parse a Linkurious Server API response
   * Generic error handling for calling Linkurious Enterprise APIs
   */
  async parse<
    T extends lke.Response<unknown>,
    E,
    Body = Exclude<T, lke.ErrorResponses<lke.LkErrorKey>>['body']
  >(
    apiPromise: Promise<T>,
    transform?: (body: Exclude<T, lke.ErrorResponses<lke.LkErrorKey>>['body']) => E,
    errorHandler: (e: lke.Response<lke.LkError>) => E = (e): never => {
      throw e;
    }
  ): Promise<Body extends E ? Body : E> {
    let result: Body extends E ? Body : E;
    const apiResponse = await apiPromise;

    if (apiResponse.isSuccess()) {
      result = (
        transform ? transform(apiResponse.body as Body) : apiResponse.body
      ) as Body extends E ? Body : E;
    } else {
      result = errorHandler(apiResponse as lke.Response<lke.LkError>) as Body extends E ? Body : E;
    }

    return result;
  }
}
