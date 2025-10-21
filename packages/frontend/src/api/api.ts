import {RestClient} from '@linkurious/rest-client';
import {CustomAction} from '@linkurious/rest-client/dist/src/api/CustomAction/types';

import {
  ApiResponse,
  VendorDetailsResponse,
  VendorSearchResponse
} from '../../../shared/api/response';
import {MyPluginConfig, MyPluginConfigPublic} from '../../../shared/myPluginConfig';
import {STRINGS} from '../../../shared/strings';
import {
  IntegrationModel,
  IntegrationModelPublic
} from '../../../shared/integration/IntegrationModel.ts';

export class API {
  private readonly restClient: RestClient;
  constructor() {
    this.restClient = new RestClient({baseUrl: '../..'});
  }

  get server(): RestClient {
    return this.restClient;
  }

  async getDataSources(): Promise<{key: string; name: string}[]> {
    const r = await this.server.dataSource.getDataSources({withStyles: false, withCaptions: false});
    if (!r.isSuccess()) {
      throw new Error(STRINGS.errors.getDataSources(r.body));
    }
    //.filter((s) => s.connected && s.state === DataSourceState.READY)
    return r.body
      .filter((s) => typeof s.key === 'string')
      .map((s) => ({
        // key is always defined on a connected source
        key: s.key!,
        name: s.name
      }));
  }

  private async plugin(
    path: string,
    queryString: Record<string, string | number | boolean>,
    expectedStatus: number,
    failureMessage: string,
    postBody?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const qs = new URLSearchParams();
    Object.entries(queryString).forEach(([key, value]) => {
      qs.set(key, `${value}`);
    });

    const verb = postBody === undefined ? 'GET' : 'POST';
    const fixedPath = path.startsWith('/') ? `.${path}` : path;
    const url = `${fixedPath}?${qs.toString()}`;
    console.log(verb + ' ' + url);
    const r = await fetch(url, {
      method: verb,
      body: postBody ? JSON.stringify(postBody) : undefined,
      headers: postBody ? {'Content-Type': 'application/json'} : undefined
    });
    if (expectedStatus && r.status !== expectedStatus) {
      const cause = await this.getPluginResponseError(r);
      const message = failureMessage ? `${failureMessage}:\n${cause}` : cause;
      throw new Error(message);
    }
    return (expectedStatus === 201 ? {} : await r.json()) as Record<string, unknown>;
  }

  async searchNode(params: {
    integrationId: string;
    sourceKey: string;
    nodeId: string;
  }): Promise<VendorSearchResponse> {
    const r = await this.plugin(
      `./api/search`,
      {
        integrationId: params.integrationId,
        sourceKey: params.sourceKey,
        nodeId: params.nodeId
      },
      200,
      STRINGS.errors.search.searchFailed(params)
    );
    return r as unknown as VendorSearchResponse;
  }

  async getDetails(
    integration: IntegrationModelPublic,
    searchResultId: string
  ): Promise<VendorDetailsResponse> {
    const r = await this.plugin(
      `./api/details`,
      {
        searchResultId: searchResultId,
        integrationId: integration.id
      },
      200,
      STRINGS.errors.details.detailsNotFound(searchResultId)
    );
    return r as unknown as VendorDetailsResponse;
  }

  async getPluginConfiguration(): Promise<MyPluginConfig> {
    const r = await this.plugin(`./api/admin-config`, {}, 200, STRINGS.errors.getAdminConfig);
    return r as unknown as MyPluginConfig;
  }

  async getPluginConfigurationPublic(): Promise<MyPluginConfigPublic> {
    const r = await this.plugin(`./api/config`, {}, 200, STRINGS.errors.getUserConfig);
    return r as unknown as MyPluginConfigPublic;
  }

  private async getPluginResponseError(r: Response): Promise<string> {
    try {
      const body = (await r.json()) as ApiResponse;
      if (body.error) {
        return body.error.message;
      } else {
        return `Unexpected HTTP status ${r.status}`;
      }
    } catch (e) {
      return `Unexpected HTTP status ${r.status}`;
    }
  }

  async getCustomActions(integration: IntegrationModel): Promise<CustomAction[]> {
    const actionsR = await this.server.customAction.getCustomActions({
      sourceKey: integration.sourceKey
    });
    if (!actionsR.isSuccess()) {
      throw new Error(STRINGS.errors.customActions.loadFailed(actionsR.body));
    }
    return actionsR.body.filter((a) => a.urlTemplate.includes(`integrationId=${integration.id}`));
  }

  async updatePluginConfig(config: MyPluginConfig): Promise<void> {
    await this.plugin('./api/admin-config', {}, 201, STRINGS.errors.setAdminConfig, config);
  }
}
