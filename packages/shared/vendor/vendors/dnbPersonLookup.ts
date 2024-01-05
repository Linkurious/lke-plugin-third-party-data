import {Vendor} from '../vendor';

export class DnbPersonLookupVendor extends Vendor<
  DnbPersonLookupSearchQuery,
  DnbPersonLookupSearchResponse
> {
  constructor() {
    super({
      key: 'dnb-people-lookup',
      name: 'Dun & Bradstreet - Basic Person Lookup',
      strategy: 'search',
      description: `Search for people using the DnB "Basic Contact Lookup" API, see <a target="_blank" href="https://docs.dnb.com/direct/2.0/en-US/entitylist/latest/findcontact/rest-API">details</a>`,
      adminFields: [{key: 'apiToken', name: 'API Token', required: true}],
      searchQueryFields: {
        KeywordText: {type: 'string', required: true}
      },
      searchResponseFields: {
        DUNSNumber: {type: 'string', required: true},
        ContactID_$: {type: 'string', required: true},
        OrganizationPrimaryName_OrganizationName_$: {type: 'string', required: true},
        ConsolidatedEmployeeDetails_TotalEmployeeQuantity: {type: 'number', required: true},
        ContactName_FirstName: {type: 'string', required: true},
        ContactName_MiddleName: {type: 'string', required: false},
        ContactName_LastName: {type: 'string', required: true},
        ContactName_FullName: {type: 'string', required: true},
        JobTitle_JobTitleText_$: {type: 'string', required: true},
        ManagementResponsibilityCodeText_$: {type: 'string', required: true}
      }
    });
  }
}

export type DnbPersonLookupSearchQuery = {
  KeywordText: string;
};

export type DnbPersonLookupSearchResponse = {
  DUNSNumber: string;
  ContactID_$: string;
  OrganizationPrimaryName_OrganizationName_$: string;
  ConsolidatedEmployeeDetails_TotalEmployeeQuantity: number;
  ContactName_FirstName: string;
  ContactName_MiddleName?: string;
  ContactName_LastName: string;
  ContactName_FullName: string;
  JobTitle_JobTitleText_$: string;
  ManagementResponsibilityCodeText_$: string;
};
