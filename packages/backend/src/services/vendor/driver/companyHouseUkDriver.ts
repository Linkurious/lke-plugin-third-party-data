import * as process from 'node:process';

import {Response} from 'superagent';

import {NeighborResult, VendorResult} from '../../../../../shared/api/response';
import {BaseDetailsSearchDriver, flattenJson} from '../baseSearchDriver';
import {VendorIntegration} from '../../../../../shared/integration/vendorIntegration';
import {
  CompanyHouseUk,
  CompanyHouseUkDetailsResponse,
  CompanyHouseUkSearchQuery,
  CompanyHouseUkSearchResponse
} from '../../../../../shared/vendor/vendors/companyHouseUk';
import {DetailsOptions} from '../../../models/detailsOptions';

const CH_DOMAIN = 'api.company-information.service.gov.uk';

export class CompanyHouseUkDriver extends BaseDetailsSearchDriver<
  CompanyHouseUkSearchQuery,
  CompanyHouseUkSearchResponse,
  CompanyHouseUkDetailsResponse
> {
  constructor() {
    super(new CompanyHouseUk());
  }

  /**
   * GET /search/companies
   * https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/search/search-companies
   */
  async search(
    searchQuery: CompanyHouseUkSearchQuery,
    integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorResult<CompanyHouseUkSearchResponse>[]> {
    const url = new URL(`https://${CH_DOMAIN}/search/companies`);
    for (const [key, value] of Object.entries(searchQuery)) {
      url.searchParams.append(key, `${value}`);
    }
    url.searchParams.set('start_index', '0');
    url.searchParams.set('items_per_page', `${maxResults}`);

    const result = await this.get<SearchResponseBody>(integration, url);
    return result.items.map((company) => {
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
   * GET /company/{companyNumber}
   * see https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/company-profile/company-profile
   */
  async getDetails(
    integration: VendorIntegration,
    detailsOptions: DetailsOptions
  ): Promise<VendorResult<CompanyHouseUkDetailsResponse>> {
    const url = new URL(`https://${CH_DOMAIN}/company/${detailsOptions.searchResultId}`);
    const result = await this.get<DetailsResponseBody>(integration, url);
    const properties = flattenJson(result) as CompanyHouseUkDetailsResponse;
    this.fixLinks(properties);

    // load optional neighbors
    const neighbors: NeighborResult[] = [];
    if (integration.getAdminSettings('officers') === 'Yes') {
      const officers = await this.getCompanyOfficers(integration, result.company_number);
      neighbors.push(
        ...officers.map((o) => ({
          edgeType: 'HAS_OFFICER',
          nodeCategory: 'Officer',
          properties: flattenJson(o)
        }))
      );
    }
    if (integration.getAdminSettings('persons-with-significant-control') === 'Yes') {
      const personsWithControl = await this.getCompanyPersonWithControl(
        integration,
        result.company_number
      );
      neighbors.push(
        ...personsWithControl.map((p) => ({
          edgeType: 'HAS_PERSON_WITH_SIGNIFICANT_CONTROL',
          nodeCategory: 'PersonWithSignificantControl',
          properties: flattenJson(p)
        }))
      );
    }

    return {
      id: `${detailsOptions.searchResultId}`,
      properties: properties,
      neighbors: neighbors
    };
  }

  private fixLinks(properties: Record<string, unknown>): void {
    // prefix all "links_" properties with this base URL:
    // https://find-and-update.company-information.service.gov.uk
    for (const [key, value] of Object.entries(properties)) {
      if (key.startsWith('links_') && typeof value === 'string' && value.startsWith('/')) {
        (properties[key] as string) =
          `https://find-and-update.company-information.service.gov.uk${value}`;
      }
    }
  }

  /**
   * GET /company/{company_number}/officers
   * see https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/officers/list
   */
  async getCompanyOfficers(
    integration: VendorIntegration,
    companyNumber: string
  ): Promise<CompanyHouseOfficer[]> {
    const url = new URL(`https://${CH_DOMAIN}/company/${companyNumber}/officers`);
    return await this.getItemsByPage<CompanyHouseOfficer>(integration, url);
  }

  /**
   * GET /company/{company_number}/persons-with-significant-control
   * see https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/persons-with-significant-control/list
   */
  async getCompanyPersonWithControl(
    integration: VendorIntegration,
    companyNumber: string
  ): Promise<CompanyHousePersonWithControl[]> {
    const url = new URL(
      `https://${CH_DOMAIN}/company/${companyNumber}/persons-with-significant-control`
    );
    return await this.getItemsByPage<CompanyHousePersonWithControl>(integration, url);
  }

  private async getItemsByPage<T>(
    integration: VendorIntegration,
    url: URL,
    pageSize = 10
  ): Promise<T[]> {
    let hasMore = true;
    const items: Array<T> = [];
    while (hasMore) {
      url.searchParams.set('items_per_page', pageSize + '');
      url.searchParams.set('start_index', items.length + '');
      const response = await this.get<{total_results: number; items: T[]}>(integration, url);
      items.push(...response.items);
      hasMore = items.length < response.total_results;
    }
    return items;
  }

  private async get<T>(integration: VendorIntegration, url: URL): Promise<T> {
    let response: Response;
    try {
      response = await this.request(url)
        .auth(integration.getAdminSettings('apiKey'), '', {type: 'basic'})
        .set('accept', 'application/json');
    } catch (e) {
      if (process.env.DEBUG) {
        console.log('HTTP error: ' + JSON.stringify(e));
      }
      throw e;
    }
    if (response.status === 401) {
      throw new Error(`Invalid API key`);
    }
    if (response.status !== 200) {
      throw new Error(`Failed to get ${url.toString()}: ${JSON.stringify(response.body)}`);
    }
    return response.body as T;
  }
}

interface SearchResponseBody {
  items_per_page: number;
  kind: string;
  start_index: number;
  total_results: number;
  items: Record<string, unknown>[];
}

/**
 * https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/resources/companyprofile?v=latest
 */
interface DetailsResponseBody extends Record<string, unknown> {
  company_name: string;
  company_number: string;
}

/**
 * https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/resources/officerlist?v=latest
 */
interface CompanyHouseOfficer {
  name: string;
  /**
   * Possible values are:
   *     cic-manager
   *     corporate-director
   *     corporate-llp-designated-member
   *     corporate-llp-member
   *     corporate-manager-of-an-eeig
   *     corporate-managing-officer
   *     corporate-member-of-a-management-organ
   *     corporate-member-of-a-supervisory-organ
   *     corporate-member-of-an-administrative-organ
   *     corporate-nominee-director
   *     corporate-nominee-secretary
   *     corporate-secretary
   *     director
   *     general-partner-in-a-limited-partnership
   *     judicial-factor
   *     limited-partner-in-a-limited-partnership
   *     llp-designated-member
   *     llp-member
   *     manager-of-an-eeig
   *     managing-officer
   *     member-of-a-management-organ
   *     member-of-a-supervisory-organ
   *     member-of-an-administrative-organ
   *     nominee-director
   *     nominee-secretary
   *     person-authorised-to-accept
   *     person-authorised-to-represent
   *     person-authorised-to-represent-and-accept
   *     receiver-and-manager
   *     secretary
   */
  officer_role: string;
  appointed_on?: string; // iso
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    care_of?: string;
    country?: string;
    locality?: string;
    po_box?: string;
    postal_code?: string;
    premises?: string;
    region?: string;
  };
  date_of_birth?: {
    month: number;
    year: number;
  };

  // bellow this line are fields no one asked for

  links: {
    officer: {
      appointments: string;
    };
    self: string;
  };

  appointed_before?: string;
  contact_details?: {
    contact_name?: string;
  };
  country_of_residence?: string;
  etag?: string;
  former_names?: [
    {
      forenames?: string;
      surname?: string;
    }
  ];
  identification?: {
    identification_type?: string;
    legal_authority?: string;
    legal_form?: string;
    place_registered?: string;
    registration_number?: string;
  };
  is_pre_1992_appointment?: boolean;
  nationality?: string;
  occupation?: string;
  person_number?: string;
  principal_office_address?: {
    address_line_1?: string;
    address_line_2?: string;
    care_of?: string;
    country?: string;
    locality?: string;
    po_box?: string;
    postal_code?: string;
    premises?: string;
    region?: string;
  };
  resigned_on?: string; // iso
  responsibilities?: string;
}

/**
 * https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/resources/list?v=latest
 */
interface CompanyHousePersonWithControl {
  name: string;
  name_elements: {
    forename: string;
    middle_name: string;
    surname: string;
    title: string;
  };
  /**
   * Possible values are:
   *     individual-person-with-significant-control
   *     corporate-entity-person-with-significant-control
   *     legal-person-with-significant-control
   *     super-secure-person-with-significant-control
   *     individual-beneficial-owner
   *     corporate-entity-beneficial-owner
   *     legal-person-beneficial-owner
   *     super-secure-beneficial-owner
   */
  kind: string;
  // appointed date?
  notified_on: string; // 'date';
  address: {
    address_line_1: string;
    address_line_2: string;
    care_of: string;
    country: string;
    locality: string;
    po_box: string;
    postal_code: string;
    premises: string;
    region: string;
  };
  date_of_birth: {
    month: number;
    year: number;
  };
  nationality: string;
  country_of_residence: string;
  natures_of_control: string[];

  // bellow this line are fields no one asked for

  ceased: boolean;
  ceased_on: string; // 'date';
  description: string;
  etag: string;
  identification: {
    country_registered: string;
    legal_authority: string;
    legal_form: string;
    place_registered: string;
    registration_number: string;
  };
  is_sanctioned: boolean;
  links: {
    self: string;
    statement: string;
  };
  principal_office_address: {
    address_line_1: string;
    address_line_2: string;
    care_of: string;
    country: string;
    locality: string;
    po_box: string;
    postal_code: string;
    premises: string;
    region: string;
  };
}
