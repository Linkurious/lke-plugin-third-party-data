import {RestClient} from '@linkurious/rest-client';

import {SearchOptions} from '../../models/searchOptions';
import {Configuration} from '../configuration';
import {VendorResult} from '../../../../shared/api/response';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';
import {STRINGS} from '../../../../shared/strings';
import {DetailsOptions} from '../../models/detailsOptions';
import {Logger, WithLogger} from '../logger';

import {DetailsSearchDriver, SearchDriver} from './searchDriver';
import {AnnuaireEntreprisesDriver} from './driver/annuaireEntreprisesDriver';
import {DnbPeopleLookupDriver} from './driver/dnbPeopleLookupDriver';
import {CompanyHouseUkDriver} from './driver/companyHouseUkDriver';

const SEARCH_DRIVERS: SearchDriver[] = [
  new AnnuaireEntreprisesDriver(),
  new DnbPeopleLookupDriver(),
  new CompanyHouseUkDriver()
];

export class Searcher extends WithLogger {
  public readonly integration: VendorIntegration;

  constructor(logger: Logger, config: Configuration, integrationId: string) {
    super(logger);
    this.integration = config.getIntegrationById(integrationId);
  }

  async getSearchResults(api: RestClient, searchOptions: SearchOptions): Promise<VendorResult[]> {
    const inputNodeR = await api.graphNode.getNode({
      sourceKey: searchOptions.sourceKey,
      id: searchOptions.nodeId,
      edgesTo: undefined,
      withDigest: false,
      withDegree: false
    });
    if (!inputNodeR.isSuccess()) {
      throw new Error(
        `Failed to get input node #${searchOptions.nodeId}: ${inputNodeR.body.message}`
      );
    }
    const inputNode = inputNodeR.body.nodes[0];

    const driver = this.getSearchDriver();
    const searchQuery = this.integration.getSearchQuery(inputNode);
    this.logger.info(`${this.integration.vendor.key}.search: ` + JSON.stringify(searchQuery));
    return driver.search(searchQuery, this.integration, searchOptions.maxResults);
  }

  async getDetails(detailsOptions: DetailsOptions): Promise<VendorResult> {
    if (this.integration.vendor.strategy === 'search') {
      throw new Error(
        `get-details is not supported for this strategy (vendor: ${this.integration.vendor.key})`
      );
    }
    const driver = this.getSearchDriver() as DetailsSearchDriver;
    this.logger.info(`${this.integration.vendor.key}.details: ` + JSON.stringify(detailsOptions));
    return driver.getDetails(this.integration, detailsOptions);
  }

  private getSearchDriver(): SearchDriver {
    const driver = SEARCH_DRIVERS.find((d) => d.vendorKey === this.integration.vendor.key);
    if (!driver) {
      throw new Error(STRINGS.errors.search.vendorNotFound(this.integration));
    }
    return driver;
  }
}
