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
      .auth(integration.getAdminSettings('apiKey'), '', {type: 'basic'})
      .set('accept', 'json');
    if (r.status === 401) {
      throw new Error(`Invalid API key`);
    }
    if (r.status !== 200) {
      throw new Error(`Failed to get search results: ${JSON.stringify(r.body)}`);
    }
    return (r.body as SearchResponseBody).items.map((company) => {
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
    const r = await this.client
      .get(url.toString())
      .auth(integration.getAdminSettings('apiKey'), '', {type: 'basic'})
      .set('accept', 'json');
    if (r.status === 401) {
      throw new Error(`Invalid API key`);
    }
    if (r.status !== 200) {
      throw new Error(`Failed to get details results: ${JSON.stringify(r.body)}`);
    }
    return {
      id: `${detailsOptions.searchResultId}`,
      properties: flattenJson(r.body as DetailsResponseBody) as CompanyHouseUkDetailsResponse
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
