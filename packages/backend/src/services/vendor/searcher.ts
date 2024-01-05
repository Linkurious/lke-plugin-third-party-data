import {RestClient} from '@linkurious/rest-client';

import {SearchOptions} from '../../models/searchOptions';
import {Configuration} from '../configuration';
import {VendorSearchResult} from '../../../../shared/api/response';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';
import {STRINGS} from '../../../../shared/strings';

import {SearchDriver} from './searchDriver';
import {AnnuaireEntreprisesDriver} from './driver/annuaireEntreprisesDriver';
import {DnbPeopleLookupDriver} from './driver/dnbPeopleLookupDriver';

const SEARCH_DRIVERS: SearchDriver[] = [
  new AnnuaireEntreprisesDriver(),
  new DnbPeopleLookupDriver()
];

export class Searcher {
  public readonly integration: VendorIntegration;
  private searchOptions: SearchOptions;

  constructor(config: Configuration, searchOptions: SearchOptions) {
    this.integration = config.getIntegrationById(searchOptions.integrationId);
    this.searchOptions = searchOptions;
  }

  async getSearchResults(api: RestClient): Promise<VendorSearchResult[]> {
    const inputNodeR = await api.graphNode.getNode({
      sourceKey: this.searchOptions.sourceKey,
      id: this.searchOptions.nodeId,
      edgesTo: undefined,
      withDigest: false,
      withDegree: false
    });
    if (!inputNodeR.isSuccess()) {
      throw new Error(
        `Failed to get input node #${this.searchOptions.nodeId}: ${inputNodeR.body.message}`
      );
    }
    const inputNode = inputNodeR.body.nodes[0];

    const driver = this.getSearchDriver();
    const searchQuery = this.integration.getSearchQuery(inputNode);
    return driver.search(searchQuery, this.integration, this.searchOptions.maxResults);
  }

  private getSearchDriver(): SearchDriver {
    const driver = SEARCH_DRIVERS.find((d) => d.vendorKey === this.integration.vendor.key);
    if (!driver) {
      throw new Error(STRINGS.errors.search.vendorNotFound(this.integration));
    }
    return driver;
  }
}
