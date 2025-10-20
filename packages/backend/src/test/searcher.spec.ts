import {it, describe} from 'node:test';
import * as assert from 'node:assert';

import {LkNode} from '@linkurious/rest-client';

import {Searcher} from '../services/vendor/searcher';
import {Logger} from '../services/logger';
import {Configuration} from '../services/configuration';
import {MyPluginConfig} from '../../../shared/myPluginConfig';
import {CompanyHouseUkSearchResponse} from '../../../shared/vendor/vendors/companyHouseUk';
import {CompanyHouseUkDriver} from '../services/vendor/driver/companyHouseUkDriver';
import {DetailsOptions} from '../models/detailsOptions';
import {API} from '../server/api';

const myConfig: MyPluginConfig = {
  basePath: '/',
  debugPort: undefined,
  integrations: [
    {
      id: 'ch',
      vendorKey: 'company-house-uk',
      adminSettings: {
        apiKey: '05efd800-e2e7-4f46-919c-d831365a42fc'
      },
      inputNodeCategory: 'Company',
      outputNodeCategory: 'Company_details',
      outputEdgeType: 'has_details',
      searchQueryFieldMapping: [
        {type: 'property', inputPropertyKey: 'name', outputPropertyKey: 'q'},
        {
          type: 'constant',
          valueType: 'string',
          outputPropertyKey: 'restrictions',
          value: 'active-companies'
        }
      ],
      outputNodeFieldMapping: [
        {type: 'property', inputPropertyKey: 'title', outputPropertyKey: 'name'}
      ],
      searchResponseFieldSelection: ['title', 'address_address_line_1', 'address_region'],
      sourceKey: 'abc123'
    }
  ]
};

const facebookNode: LkNode = {
  id: '123',
  data: {
    categories: ['Company'],
    properties: {
      name: 'Facebook'
    },
    geo: {},
    readAt: 0,
    isVirtual: false,
    statistics: undefined
  }
};

void describe('Searcher', () => {
  const logger = new Logger();
  const config: Configuration = new Configuration(myConfig, undefined as unknown as API, logger);

  void it('should search for facebook with company house', async () => {
    const s = new Searcher(logger, config, 'ch');
    const driver = s['getSearchDriver']();
    const searchQuery = s.integration.getSearchQuery(facebookNode);
    const results = await driver.search(searchQuery, s.integration, 3);
    //console.log(JSON.stringify(results, null, 2));
    const addresses = results.map(
      (r) => (r.properties as CompanyHouseUkSearchResponse).address_country
    );
    assert.deepStrictEqual(
      addresses.some((v) => v === 'England'),
      true
    );
  });

  void it('should fetch details for facebook', async () => {
    // search
    const s = new Searcher(logger, config, 'ch');
    const searchDriver = s['getSearchDriver']();
    const searchQuery = s.integration.getSearchQuery(facebookNode);
    const results = await searchDriver.search(searchQuery, s.integration, 3);
    assert.deepStrictEqual(results.length, 3);

    // get details
    const driver = new CompanyHouseUkDriver();
    const details = await driver.getDetails(
      config.getIntegrationById('ch'),
      new DetailsOptions({integrationId: 'ds', searchResultId: results[2].id})
    );
    assert.deepEqual(details.properties.registered_office_address_country, 'United Kingdom');
    //console.log(JSON.stringify(details));
  });
});
