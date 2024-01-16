import {Vendor} from '../vendor';

export class CompanyHouseUk extends Vendor<
  CompanyHouseUkSearchQuery,
  CompanyHouseUkSearchResponse
> {
  constructor() {
    super({
      key: 'company-house-uk',
      name: 'Company House UK',
      strategy: 'searchAndDetails',
      description: `Search for companies using the Company House UK API, see <a target="_blank" href="https://developer.company-information.service.gov.uk/">details</a>`,
      adminFields: [{key: 'apiKey', name: 'API Key', required: true}],
      searchQueryFields: {
        q: {type: 'string', required: true},
        restrictions: {type: 'string', required: false}
      },
      searchResponseFields: {
        title: {type: 'string', required: true},
        address_address_line_1: {type: 'string', required: true},
        address_address_line_2: {type: 'string', required: true},
        address_care_of: {type: 'string', required: false},
        address_country: {type: 'string', required: true},
        address_locality: {type: 'string', required: true},
        address_po_box: {type: 'string', required: false},
        address_postal_code: {type: 'string', required: true},
        address_region: {type: 'string', required: true},
        company_number: {type: 'string', required: true},
        company_status: {type: 'string', required: true},
        company_type: {type: 'string', required: true},
        date_of_cessation: {type: 'string', required: false},
        date_of_creation: {type: 'string', required: true},
        description: {type: 'string', required: true},
        description_identifier: {type: 'string', required: true},
        kind: {type: 'string', required: true},
        links_self: {type: 'string', required: true}
      },
      detailsResponseFields: {
        accounts_accounting_reference_date_day: {type: 'number', required: true},
        accounts_accounting_reference_date_month: {type: 'number', required: true},
        accounts_last_accounts_made_up_to: {type: 'string', required: true},
        accounts_last_accounts_type: {type: 'string', required: true},
        accounts_next_due: {type: 'string', required: true},
        accounts_next_made_up_to: {type: 'string', required: true},
        accounts_overdue: {type: 'boolean', required: true},
        annual_return_last_made_up_to: {type: 'string', required: true},
        annual_return_next_due: {type: 'string', required: true},
        annual_return_next_made_up_to: {type: 'string', required: true},
        annual_return_overdue: {type: 'boolean', required: true},
        branch_company_details_business_activity: {type: 'string', required: true},
        branch_company_details_parent_company_name: {type: 'string', required: true},
        branch_company_details_parent_company_number: {type: 'string', required: true},
        can_file: {type: 'boolean', required: true},
        company_name: {type: 'string', required: true},
        company_number: {type: 'string', required: true},
        company_status: {type: 'string', required: true},
        company_status_detail: {type: 'string', required: true},
        confirmation_statement_last_made_up_to: {type: 'string', required: true},
        confirmation_statement_next_due: {type: 'string', required: true},
        confirmation_statement_next_made_up_to: {type: 'string', required: true},
        confirmation_statement_overdue: {type: 'boolean', required: true},
        date_of_cessation: {type: 'string', required: false},
        date_of_creation: {type: 'string', required: true},
        foreign_company_details_accounting_requirement_foreign_account_type: {
          type: 'string',
          required: true
        },
        foreign_company_details_accounting_requirement_terms_of_account_publication: {
          type: 'string',
          required: true
        },
        foreign_company_details_accounts_account_period_from_day: {
          type: 'number',
          required: true
        },
        foreign_company_details_accounts_account_period_from_month: {
          type: 'number',
          required: true
        },
        foreign_company_details_accounts_account_period_to_day: {
          type: 'number',
          required: true
        },
        foreign_company_details_accounts_account_period_to_month: {
          type: 'number',
          required: true
        },
        foreign_company_details_accounts_must_file_within_months: {
          type: 'number',
          required: true
        },
        foreign_company_details_business_activity: {type: 'string', required: true},
        foreign_company_details_company_type: {type: 'string', required: true},
        foreign_company_details_governed_by: {type: 'string', required: true},
        foreign_company_details_is_a_credit_finance_institution: {
          type: 'boolean',
          required: true
        },
        foreign_company_details_originating_registry_country: {
          type: 'string',
          required: true
        },
        foreign_company_details_originating_registry_name: {type: 'string', required: true},
        foreign_company_details_registration_number: {type: 'string', required: true},
        has_been_liquidated: {type: 'boolean', required: true},
        has_charges: {type: 'boolean', required: true},
        has_insolvency_history: {type: 'boolean', required: true},
        is_community_interest_company: {type: 'boolean', required: true},
        jurisdiction: {type: 'string', required: true},
        last_full_members_list_date: {type: 'string', required: true},
        links_persons_with_significant_control: {type: 'string', required: true},
        links_persons_with_significant_control_statements: {type: 'string', required: true},
        links_registers: {type: 'string', required: true},
        links_self: {type: 'string', required: true},
        previous_company_names: {type: 'string', required: true},
        registered_office_address_address_line_1: {type: 'string', required: true},
        registered_office_address_address_line_2: {type: 'string', required: true},
        registered_office_address_care_of: {type: 'string', required: false},
        registered_office_address_country: {type: 'string', required: true},
        registered_office_address_locality: {type: 'string', required: true},
        registered_office_address_po_box: {type: 'string', required: false},
        registered_office_address_postal_code: {type: 'string', required: true},
        registered_office_address_premises: {type: 'string', required: false},
        registered_office_address_region: {type: 'string', required: true},
        registered_office_is_in_dispute: {type: 'boolean', required: true},
        service_address_address_line_1: {type: 'string', required: true},
        service_address_address_line_2: {type: 'string', required: true},
        service_address_care_of: {type: 'string', required: false},
        service_address_country: {type: 'string', required: true},
        service_address_locality: {type: 'string', required: true},
        service_address_po_box: {type: 'string', required: false},
        service_address_postal_code: {type: 'string', required: true},
        service_address_region: {type: 'string', required: true},
        sic_codes: {type: 'string', required: true},
        super_secure_managing_officer_count: {type: 'number', required: true},
        type: {type: 'string', required: true},
        undeliverable_registered_office_address: {type: 'boolean', required: true}
      }
    });
  }
}

export type CompanyHouseUkSearchQuery = {
  q: string;
  restrictions?: string;
};

export type CompanyHouseUkSearchResponse = {
  address_address_line_1: string;
  address_address_line_2: string;
  address_care_of?: string;
  address_country: string;
  address_locality: string;
  address_po_box?: string;
  address_postal_code: string;
  address_region: string;
  company_number: string;
  company_status: string;
  company_type: string;
  date_of_cessation?: string;
  date_of_creation: string;
  description: string;
  description_identifier: string;
  kind: string;
  title: string;
  links_self: string;
};

/**
 * {
 *     "accounts": {
 *         "accounting_reference_date": {
 *             "day": "integer",
 *             "month": "integer"
 *         },
 *         "last_accounts": {
 *             "made_up_to": "date",
 *             "type": {}
 *         },
 *         "next_due": "date",
 *         "next_made_up_to": "date",
 *         "overdue": "boolean"
 *     },
 *     "annual_return": {
 *         "last_made_up_to": "date",
 *         "next_due": "date",
 *         "next_made_up_to": "date",
 *         "overdue": "boolean"
 *     },
 *     "branch_company_details": {
 *         "business_activity": "string",
 *         "parent_company_name": "string",
 *         "parent_company_number": "string"
 *     },
 *     "can_file": "boolean",
 *     "company_name": "string",
 *     "company_number": "string",
 *     "company_status": "string",
 *     "company_status_detail": "string",
 *     "confirmation_statement": {
 *         "last_made_up_to": "date",
 *         "next_due": "date",
 *         "next_made_up_to": "date",
 *         "overdue": "boolean"
 *     },
 *     "date_of_cessation": "date",
 *     "date_of_creation": "date",
 *     "etag": "string",
 *     "foreign_company_details": {
 *         "accounting_requirement": {
 *             "foreign_account_type": "string",
 *             "terms_of_account_publication": "string"
 *         },
 *         "accounts": {
 *             "account_period_from:": {
 *                 "day": "integer",
 *                 "month": "integer"
 *             },
 *             "account_period_to": {
 *                 "day": "integer",
 *                 "month": "integer"
 *             },
 *             "must_file_within": {
 *                 "months": "integer"
 *             }
 *         },
 *         "business_activity": "string",
 *         "company_type": "string",
 *         "governed_by": "string",
 *         "is_a_credit_finance_institution": "boolean",
 *         "originating_registry": {
 *             "country": "string",
 *             "name": "string"
 *         },
 *         "registration_number": "string"
 *     },
 *     "has_been_liquidated": "boolean",
 *     "has_charges": "boolean",
 *     "has_insolvency_history": "boolean",
 *     "is_community_interest_company": "boolean",
 *     "jurisdiction": "string",
 *     "last_full_members_list_date": "date",
 *     "links": {
 *         "persons_with_significant_control": "string",
 *         "persons_with_significant_control_statements": "string",
 *         "registers": "string",
 *         "self": "string"
 *     },
 *     "previous_company_names": [
 *         {
 *             "ceased_on": "date",
 *             "effective_from": "date",
 *             "name": "string"
 *         }
 *     ],
 *     "registered_office_address": {
 *         "address_line_1": "string",
 *         "address_line_2": "string",
 *         "care_of": "string",
 *         "country": "string",
 *         "locality": "string",
 *         "po_box": "string",
 *         "postal_code": "string",
 *         "premises": "string",
 *         "region": "string"
 *     },
 *     "registered_office_is_in_dispute": "boolean",
 *     "service_address": {
 *         "address_line_1": "string",
 *         "address_line_2": "string",
 *         "care_of": "string",
 *         "country": "string",
 *         "locality": "string",
 *         "po_box": "string",
 *         "postal_code": "string",
 *         "region": "string"
 *     },
 *     "sic_codes": [
 *         "string"
 *     ],
 *     "super_secure_managing_officer_count": "integer",
 *     "type": "string",
 *     "undeliverable_registered_office_address": "boolean"
 * }
 */
export type CompanyHouseUkDetailsResponse = {
  accounts_accounting_reference_date_day: number;
  accounts_accounting_reference_date_month: number;
  accounts_last_accounts_made_up_to: string;
  accounts_last_accounts_type: string;
  accounts_next_due: string;
  accounts_next_made_up_to: string;
  accounts_overdue: boolean;
  annual_return_last_made_up_to: string;
  annual_return_next_due: string;
  annual_return_next_made_up_to: string;
  annual_return_overdue: boolean;
  branch_company_details_business_activity: string;
  branch_company_details_parent_company_name: string;
  branch_company_details_parent_company_number: string;
  can_file: boolean;
  company_name: string;
  company_number: string;
  company_status: string;
  company_status_detail: string;
  confirmation_statement_last_made_up_to: string;
  confirmation_statement_next_due: string;
  confirmation_statement_next_made_up_to: string;
  confirmation_statement_overdue: boolean;
  date_of_cessation?: string;
  date_of_creation: string;
  foreign_company_details_accounting_requirement_foreign_account_type: string;
  foreign_company_details_accounting_requirement_terms_of_account_publication: string;
  foreign_company_details_accounts_account_period_from_day: number;
  foreign_company_details_accounts_account_period_from_month: number;
  foreign_company_details_accounts_account_period_to_day: number;
  foreign_company_details_accounts_account_period_to_month: number;
  foreign_company_details_accounts_must_file_within_months: number;
  foreign_company_details_business_activity: string;
  foreign_company_details_company_type: string;
  foreign_company_details_governed_by: string;
  foreign_company_details_is_a_credit_finance_institution: boolean;
  foreign_company_details_originating_registry_country: string;
  foreign_company_details_originating_registry_name: string;
  foreign_company_details_registration_number: string;
  has_been_liquidated: boolean;
  has_charges: boolean;
  has_insolvency_history: boolean;
  is_community_interest_company: boolean;
  jurisdiction: string;
  last_full_members_list_date: string;
  links_persons_with_significant_control: string;
  links_persons_with_significant_control_statements: string;
  links_registers: string;
  links_self: string;
  previous_company_names: string;
  registered_office_address_address_line_1: string;
  registered_office_address_address_line_2: string;
  registered_office_address_care_of?: string;
  registered_office_address_country: string;
  registered_office_address_locality: string;
  registered_office_address_po_box?: string;
  registered_office_address_postal_code: string;
  registered_office_address_premises?: string;
  registered_office_address_region: string;
  registered_office_is_in_dispute: boolean;
  service_address_address_line_1: string;
  service_address_address_line_2: string;
  service_address_care_of?: string;
  service_address_country: string;
  service_address_locality: string;
  service_address_po_box?: string;
  service_address_postal_code: string;
  service_address_region: string;
  sic_codes: string;
  super_secure_managing_officer_count: number;
  type: string;
  undeliverable_registered_office_address: boolean;
};
