import * as fs from 'node:fs';
import {Response} from 'superagent';

import {VendorResult} from '../../../../../shared/api/response';
import {BaseDetailsSearchDriver, flattenJson} from '../baseSearchDriver';
import {VendorIntegration} from '../../../../../shared/integration/vendorIntegration';
import {
  CompanyHouseUk,
  CompanyHouseUkDetailsResponse,
  CompanyHouseUkSearchQuery,
  CompanyHouseUkSearchResponse
} from '../../../../../shared/vendor/vendors/companyHouseUk';
import {DetailsOptions} from '../../../models/detailsOptions';

export class CompanyHouseUkDriver extends BaseDetailsSearchDriver<
  CompanyHouseUkSearchQuery,
  CompanyHouseUkSearchResponse,
  CompanyHouseUkDetailsResponse
> {
  constructor() {
    super(new CompanyHouseUk());
  }

  /**
   * https://api.company-information.service.gov.uk/search/companies
   * https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/search/search-companies
   */
  async search(
    searchQuery: CompanyHouseUkSearchQuery,
    integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorResult<CompanyHouseUkSearchResponse>[]> {
    const url = new URL('https://api.company-information.service.gov.uk/search/companies');
    for (const [key, value] of Object.entries(searchQuery)) {
      url.searchParams.append(key, `${value}`);
    }
    url.searchParams.set('start_index', '1');
    url.searchParams.set('items_per_page', `${maxResults}`);

    const r = await this.client
      .get(url.toString())
      .ca(fs.readFileSync('path/to/wss.pem', {encoding: 'utf-8'}))
      .disableTLSCerts()
      .auth(integration.getAdminSettings('apiKey'), '', {type: 'basic'})
      .set('accept', 'application/json');
    if (r.status === 401) {
      throw new Error(`Invalid API key`);
    }
    if (r.status !== 200) {
      throw new Error(`Failed to get search results: ${JSON.stringify(r.body)}`);
    }
    return (r.body as SearchResponseBody).items.map((company) => {
      delete company.kind;
      delete company.snippet;
      delete company.address_snippet;
      delete company.matches;
      return {
        id: `${company.company_number as string}`,
        properties: flattenJson(company) as CompanyHouseUkSearchResponse
      };
    });
  }

  /**
   * https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/company-profile/company-profile
   */
  async getDetails(
    integration: VendorIntegration,
    detailsOptions: DetailsOptions
  ): Promise<VendorResult<CompanyHouseUkDetailsResponse>> {
    const url = new URL(
      `https://api.company-information.service.gov.uk/company/${detailsOptions.searchResultId}`
    );
    let r: Response;
    try {
      r = await this.client
        .get(url.toString())
        .auth(integration.getAdminSettings('apiKey'), '', {type: 'basic'})
        .set('accept', 'application/json');
    } catch (e) {
      if (process.env.DEBUG) {
        console.log('HTTP error: ' + JSON.stringify(e));
      }
      throw e;
    }
    if (r.status === 401) {
      throw new Error(`Invalid API key`);
    }
    if (r.status !== 200) {
      throw new Error(`Failed to get details results: ${JSON.stringify(r.body)}`);
    }

    const properties = flattenJson(r.body as DetailsResponseBody) as CompanyHouseUkDetailsResponse;

    // prefix all "links_" properties with this base URL:
    // https://find-and-update.company-information.service.gov.uk
    for (const [k, v] of Object.entries(properties)) {
      const key = k as keyof CompanyHouseUkDetailsResponse;
      if (key.startsWith('links_') && typeof v === 'string' && v.startsWith('/')) {
        (properties[key] as string) =
          `https://find-and-update.company-information.service.gov.uk${v}`;
      }
    }

    return {
      id: `${detailsOptions.searchResultId}`,
      properties: properties
    };
  }
}

interface SearchResponseBody {
  items_per_page: number;
  kind: string;
  start_index: number;
  total_results: number;
  items: Record<string, unknown>[];
}

interface DetailsResponseBody extends Record<string, unknown> {
  company_name: string;
  company_number: string;
}
