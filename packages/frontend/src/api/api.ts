import {RestClient} from '@linkurious/rest-client';

import {VendorSearchResponse} from '../../../shared/api/response';
import {MyPluginConfig, MyPluginConfigPublic} from '../../../shared/myPluginConfig.ts';

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
      throw new Error(`Get connected sources: could not get list of sources (${r.body.message})`);
    }
    //.filter((s) => s.connected && s.state === DataSourceState.READY)
    return r.body.map((s) => ({
      // key is always defined on a connected source
      key: s.key!,
      name: s.name
    }));
  }

  private async plugin(
    path: string,
    queryString: Record<string, string | number | boolean>,
    expectedStatus: number,
    failureMessage: string
  ): Promise<Record<string, unknown>> {
    const qs = new URLSearchParams();
    Object.entries(queryString).forEach(([key, value]) => {
      qs.set(key, `${value}`);
    });

    const fixedPath = path.startsWith('/') ? `.${path}` : path;
    const url = `${fixedPath}?${qs.toString()}`;
    console.log('GET ' + url);
    const r = await fetch(url);
    if (expectedStatus && r.status !== expectedStatus) {
      const cause = `Unexpected HTTP status ${r.status}`;
      const message = failureMessage ? `${failureMessage} (${cause})` : cause;
      throw new Error(message);
    }
    return (await r.json()) as Record<string, unknown>;
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
      `Failed searching for Node ${params.nodeId} in source ${params.sourceKey}`
    );
    return r as unknown as VendorSearchResponse;
  }

  async getPluginConfiguration(): Promise<MyPluginConfig> {
    const r = await this.plugin(
      `./api/admin-config`,
      {},
      200,
      `Could not get the plugin's admin-configuration`
    );
    return r as unknown as MyPluginConfig;
  }

  async getPluginConfigurationPublic(): Promise<MyPluginConfigPublic> {
    const r = await this.plugin(
      `./api/config`,
      {},
      200,
      `Could not get the plugin's user-configuration`
    );
    return r as unknown as MyPluginConfigPublic;
  }
}
