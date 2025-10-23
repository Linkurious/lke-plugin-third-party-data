import {VendorResult} from '../../../../../shared/api/response';
import {BaseSearchDriver, flattenJson} from '../baseSearchDriver';
import {VendorIntegration} from '../../../../../shared/integration/vendorIntegration';
import {
  DnbPersonLookupSearchQuery,
  DnbPersonLookupSearchResponse,
  DnbPersonLookupVendor
} from '../../../../../shared/vendor/vendors/dnbPersonLookup';

export class DnbPeopleLookupDriver extends BaseSearchDriver<
  DnbPersonLookupSearchQuery,
  DnbPersonLookupSearchResponse
> {
  constructor() {
    super(new DnbPersonLookupVendor());
  }

  /**
   * https://docs.dnb.com/direct/2.0/en-US/entitylist/latest/findcontact/EM-rest-API#ContactEmailLookup
   */
  async search(
    searchQuery: DnbPersonLookupSearchQuery,
    integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorResult<DnbPersonLookupSearchResponse>[]> {
    const url = new URL('https://direct.dnb.com/V6.4/organizations');
    url.searchParams.set('CandidateMaximumQuantity', `${maxResults}`);
    url.searchParams.set('findcontact', `${true}`);
    url.searchParams.set('InclusionDataDescription', 'IncludeNonMarketable');

    // by email:
    // SearchModeDescription=EmailLookup&
    // ContactEmailAddress=testemail@gormantest.com&
    // InclusionDataDescription=IncludeNonMarketable
    // by name:
    // SearchModeDescription=Basic&
    // KeywordText=Gorman%20Manufacturing&
    // KeywordContactText=Kevin&
    // InclusionDataDescription=IncludeNonMarketable
    for (const [key, value] of Object.entries(searchQuery)) {
      url.searchParams.append(key, `${value}`);
    }
    const token = integration.getAdminSettings('apiToken') as string;
    const r = await this.request(url)
      .auth(token, {type: 'bearer'})
      .set('accept', 'application/json');
    if (r.status !== 200) {
      throw new Error(`Failed to get search results (http ${r.status})`);
    }
    return (r.body as ResponseBody).FindContactResponse.FindContactResponseDetail.FindCandidate.map(
      (res) => {
        return {
          id: `duns:${res.DUNSNumber}`,
          properties: flattenJson(res) as DnbPersonLookupSearchResponse
        };
      }
    );
  }
}

type ResponseBody = {
  FindContactResponse: {
    FindContactResponseDetail: {
      FindCandidate: {DUNSNumber: string}[];
    };
  };
};

/**
 * @example response:
 * {
 *   "FindContactResponse": {
 *     "@ServiceVersionNumber": "6.4",
 *     "TransactionDetail": {
 *       "ApplicationTransactionID": "ServiceGovernance EntityList 6.4 Sample",
 *       "ServiceTransactionID": "Id-d04cac56df95010074020100aece7395-1",
 *       "TransactionTimestamp": "2016-01-30T00:40:32"
 *     },
 *     "TransactionResult": {
 *       "SeverityText": "Information",
 *       "ResultID": "CM000",
 *       "ResultText": "Success"
 *     },
 *     "FindContactResponseDetail": {
 *       "CandidateMatchedQuantity": 2,
 *       "CandidateReturnedQuantity": 2,
 *       "FindCandidate": [
 *         {
 *           "DUNSNumber": "804735132",
 *           "ContactID": {
 *             "$": "804735132-5412658"
 *           },
 *           "OrganizationPrimaryName": {
 *             "OrganizationName": {
 *               "$": "Gorman Manufacturing Company, Inc."
 *             }
 *           },
 *           "ConsolidatedEmployeeDetails": {
 *             "TotalEmployeeQuantity": 125
 *           },
 *           "NonMarketableReasonText": [],
 *           "ContactName": {
 *             "FirstName": "Kevin",
 *             "MiddleName": "J",
 *             "LastName": "Hunt",
 *             "FullName": "Kevin J Hunt"
 *           },
 *           "PrincipalIdentificationNumberDetail": [
 *             {
 *               "@DNBCodeValue": 24215,
 *               "@TypeText": "Professional Contact Identifier",
 *               "PrincipalIdentificationNumber": "5412658"
 *             }
 *           ],
 *           "JobTitle": [
 *             {
 *               "JobTitleText": {
 *                 "$": "Sec-treas"
 *               }
 *             }
 *           ],
 *           "ManagementResponsibilityCodeText": [
 *             {
 *               "$": "Secretary"
 *             }
 *           ],
 *           "JobRanking": "2",
 *           "ContactDataSourceDetail": {
 *             "NameInformationSourceName": {
 *               "$": "DNB"
 *             }
 *           },
 *           "DirectTelephoneInformationAvailableIndicator": false,
 *           "DirectEmailInformationAvailableIndicator": false,
 *           "ManufacturingIndicator": true,
 *           "DisplaySequence": 1
 *         },
 *         {
 *           "DUNSNumber": "804735132",
 *           "ContactID": {
 *             "$": "804735132-5412657"
 *           },
 *           "OrganizationPrimaryName": {
 *             "OrganizationName": {
 *               "$": "Gorman Manufacturing Company, Inc."
 *             }
 *           },
 *           "ConsolidatedEmployeeDetails": {
 *             "TotalEmployeeQuantity": 125
 *           },
 *           "NonMarketableReasonText": [
 *             {
 *               "@DNBCodeValue": 11028,
 *               "$": "De-listed"
 *             }
 *           ],
 *           "ContactName": {
 *             "FirstName": "Leslie",
 *             "LastName": "Smith",
 *             "FullName": "Leslie Smith"
 *           },
 *           "PrincipalIdentificationNumberDetail": [
 *             {
 *               "@DNBCodeValue": 24215,
 *               "@TypeText": "Professional Contact Identifier",
 *               "PrincipalIdentificationNumber": "5412657"
 *             }
 *           ],
 *           "JobTitle": [
 *             {
 *               "JobTitleText": {
 *                 "$": "Pres"
 *               }
 *             }
 *           ],
 *           "ManagementResponsibilityCodeText": [
 *             {
 *               "$": "President"
 *             }
 *           ],
 *           "JobRanking": "5",
 *           "ContactDataSourceDetail": {
 *             "NameInformationSourceName": {
 *               "$": "DNB"
 *             }
 *           },
 *           "DirectTelephoneInformationAvailableIndicator": false,
 *           "DirectEmailInformationAvailableIndicator": false,
 *           "ManufacturingIndicator": true,
 *           "DisplaySequence": 2
 *         }
 *       ]
 *     }
 *   }
 * }
 */
