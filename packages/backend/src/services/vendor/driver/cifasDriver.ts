import {Buffer} from 'node:buffer';
import * as process from 'node:process';

import {Response} from 'superagent';

import {NeighborResult, VendorResult} from '../../../../../shared/api/response';
import {BaseDetailsSearchDriver, flattenJson} from '../baseSearchDriver';
import {VendorIntegration} from '../../../../../shared/integration/vendorIntegration';
import {
  Cifas,
  CifasBankOrBuildingSocietyAccount,
  CifasDetailsResponse,
  CifasDocument,
  CifasPaymentCard,
  CifasSearchQuery,
  CifasSearchResponse,
  CifasStructuredAddress,
  isBankAccountKey,
  isDocumentKey,
  isPaymentCardKey,
  isStructuredAddressKey
} from '../../../../../shared/vendor/vendors/cifas';
import {DetailsOptions} from '../../../models/detailsOptions';
import {AbstractFields} from '../../../../../shared/vendor/vendorModel';
import {VendorContext} from '../../../../../shared/vendor/vendorContext';

import {CifasSubjectHelper} from './cifasSubject';

// LKE-14966 - training environment
const CIFAS_TEST_BASE_URL = 'https://trainingapi.cifas.org.uk';
const CIFAS_BASE_URL = 'https://api.cifas.org.uk/';

export class CifasDriver extends BaseDetailsSearchDriver<
  CifasSearchQuery,
  CifasSearchResponse,
  CifasDetailsResponse,
  CifasEdgeProperties
> {
  constructor() {
    super(new Cifas());
  }

  /**
   * POST /v1/NFD/Search
   * https://portal.cifas.org.uk/en-GB/Support/SearchDocumentation
   */
  async search(
    searchQuery: CifasSearchQuery,
    integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorResult<CifasSearchResponse, CifasEdgeProperties>[]> {
    const result = await this.call<CifasSearchResponseBody>(
      integration,
      '/v1/NFD/Search',
      'post',
      buildCifasSearchBody(searchQuery, integration)
    );
    if (result.processingErrors?.length) {
      this.logger.warn(`CIFAS processing errors: ${result.processingErrors.join(', ')}`);
    }
    // keep the order returned by CIFAS: it reflects their prioritisation
    return (result.caseSearchResult.matches ?? []).slice(0, maxResults).map((match) => ({
      id: `${match.case.caseId}`,
      properties: flattenJson(match.case, true) as CifasSearchResponse,
      keyProperty: 'caseId',
      edgeKeyProperty: 'caseId'
    }));
  }

  /**
   * GET /v1/NFD/Cases/{caseId}
   * https://portal.cifas.org.uk/en-GB/Support/SearchDocumentation
   */
  async getDetails(
    integration: VendorIntegration,
    detailsOptions: DetailsOptions,
    context: VendorContext
  ): Promise<VendorResult<CifasDetailsResponse, CifasEdgeProperties>> {
    const caseId = encodeURIComponent(detailsOptions.searchResultId);
    const cifasCase = await this.call<CifasCaseBody>(integration, `/v1/NFD/Cases/${caseId}`, 'get');

    // create edge with properties
    const edgeProperties: CifasEdgeProperties = {
      caseId: cifasCase.caseId,
      requestedAt: context.requestedAt.toISOString()
    };
    if (context.user) {
      edgeProperties.requestedBy = context.user.username;
    }

    return {
      id: `${cifasCase.caseId}`,
      properties: CifasDriver.toCaseProperties(cifasCase),
      keyProperty: 'caseId',
      edgeKeyProperty: 'caseId',
      edgeProperties: edgeProperties,
      neighbors: extractCifasSubjectNeighbors(cifasCase)
    };
  }

  private async call<T>(
    integration: VendorIntegration,
    endpoint: string,
    verb: 'get' | 'post',
    body?: unknown
  ): Promise<T> {
    const url = this.buildUrl(endpoint, integration);
    // the PFX certificate is stored as a base64 string in the plugin configuration
    const pfx = Buffer.from(
      integration.getAdminSettings('pfxCertificateSecret') as string,
      'base64'
    );
    const passphrase = integration.getAdminSettings('pfxCertificatePassphrase') as string;

    const request = this.request(url, verb)
      .pfx({pfx: pfx, passphrase: passphrase})
      .set('accept', 'application/json')
      .set(
        'X-RequestingInstitution',
        integration.getAdminSettings('requestingInstitution') as string
      )
      .set('X-OwningMemberNumber', integration.getAdminSettings('owningMemberNumber') as string)
      .set('X-ManagingMemberNumber', integration.getAdminSettings('managingMemberNumber') as string)
      .set('X-CurrentUser', integration.getAdminSettings('currentUserReference') as string);

    let response: Response;
    try {
      if (body !== undefined) {
        response = await request.send(body as object);
      } else {
        response = await request;
      }
    } catch (e) {
      if (process.env.DEBUG) {
        console.log('HTTP error: ' + JSON.stringify(e));
      }
      throw e;
    }
    if (response.status === 401) {
      throw new Error(`CIFAS authentication failed: ${describeBody(response)}`);
    }
    if (response.status === 404) {
      throw new Error(`CIFAS: not found (${url.pathname})`);
    }
    if (!response.ok) {
      throw new Error(`CIFAS request failed (${response.status}): ${describeBody(response)}`);
    }
    return response.body as T;
  }

  private buildUrl(endpoint: string, integration: VendorIntegration): URL {
    const testApi = integration.getAdminSettings('testApi') as boolean;
    const baseUrl = testApi ? CIFAS_TEST_BASE_URL : CIFAS_BASE_URL;
    return new URL(endpoint, baseUrl);
  }

  /** the case properties, without the subjects (they are returned as neighbors) */
  public static toCaseProperties(cifasCase: CifasCaseBody): CifasDetailsResponse {
    const {subjects, filingReasons, ...rest} = cifasCase;
    void subjects;
    const properties = flattenJson(rest);
    properties.filingReasons = formatReferences(filingReasons);
    return properties as unknown as CifasDetailsResponse;
  }
}

interface CifasEdgeProperties extends AbstractFields {
  caseId: number;
  requestedBy?: string;
  requestedAt: string;
}

/**
 * Builds the body of POST /v1/NFD/Search from the (flat) search query. Empty values are removed.
 */
export function buildCifasSearchBody(
  searchQuery: CifasSearchQuery,
  integration: VendorIntegration
): CifasSearchRequestBody {
  const search: Record<string, string | object> = {};
  const addresses: Array<CifasStructuredAddress> = [];
  const bankAccounts: Array<CifasBankOrBuildingSocietyAccount> = [];
  const paymentCards: Array<CifasPaymentCard> = [];
  const documents: Array<CifasDocument> = [];
  for (const [key, value] of Object.entries(searchQuery)) {
    if (Array.isArray(value)) {
      if (isStructuredAddressKey(key)) {
        for (let i = 0; i < value.length; i++) {
          const text = `${value[i]}`.trim();
          if (text === '') {
            continue; // missing value: keep the index to preserve neighbor association
          }
          if (addresses[i] === undefined) {
            addresses[i] = {
              format: 'structuredAddress',
              locationAlerts: false
            };
          }

          addresses[i][key] = text;
        }
      }
      if (isBankAccountKey(key)) {
        for (let i = 0; i < value.length; i++) {
          const text = `${value[i]}`.trim();
          if (text === '') {
            continue; // missing value: keep the index to preserve neighbor association
          }
          if (bankAccounts[i] === undefined) {
            bankAccounts[i] = {
              type: 'bankOrBuildingSocietyAccount',
              sortCode: '',
              accountNumber: ''
            };
          }

          bankAccounts[i][key] = text;
        }
      }
      if (isPaymentCardKey(key)) {
        for (let i = 0; i < value.length; i++) {
          const text = `${value[i]}`.trim();
          if (text === '') {
            continue; // missing value: keep the index to preserve neighbor association
          }
          if (paymentCards[i] === undefined) {
            paymentCards[i] = {
              type: 'paymentCard',
              cardNumber: ''
            };
          }

          paymentCards[i][key] = text;
        }
      }
      if (isDocumentKey(key)) {
        for (let i = 0; i < value.length; i++) {
          const text = `${value[i]}`.trim();
          if (text === '') {
            continue; // missing value: keep the index to preserve neighbor association
          }
          if (documents[i] === undefined) {
            documents[i] = {
              reference: ''
            };
          }

          documents[i][key] = text;
        }
      }
    } else if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      search[key] = `${value}`.trim();
    }
  }

  // arrays may contain holes where all the values of an index were missing
  const compact = <T>(items: T[]): T[] => items.filter((item) => item !== undefined);
  const addressList = compact(addresses);
  const financeList = [...compact(bankAccounts), ...compact(paymentCards)];
  const documentList = compact(documents);
  if (addressList.length > 0) {
    search.addresses = addressList.slice(0, 10); // CIFAS limit
  }
  if (financeList.length > 0) {
    search.financeDetails = financeList.slice(0, 10); // CIFAS limit
  }
  if (documentList.length > 0) {
    search.documents = documentList.slice(0, 10); // CIFAS limit
  }

  if (Object.keys(search).length === 0) {
    throw new Error('CIFAS: at least one search criterion is required');
  }
  return {
    memberReferenceNumber: integration.getAdminSettings('managingMemberNumber') as string,
    search: search
  };
}

function formatReferences(references: CifasReference[] | undefined): string {
  return (references ?? []).map((r) => `${r.referenceCode} - ${r.description}`).join('\n');
}

export function extractCifasSubjectNeighbors(cifasCase: CifasCaseBody): NeighborResult[] {
  return (cifasCase.subjects ?? []).map((subject) => {
    const properties = flattenJson(subject, true) as Record<string, string | number | boolean>;
    properties.subjectId = CifasSubjectHelper.getId({
      caseId: cifasCase.caseId,
      firstName: subject.firstName,
      surname: subject.surname,
      birthDate: subject.birthDate
    });
    return {
      edgeType: 'HAS_SUBJECT',
      nodeCategory: 'CIFAS_Subject',
      keyProperty: 'subjectId',
      edgeKeyProperty: 'subjectId',
      properties: properties
    };
  });
}

function describeBody(response: {body?: unknown; text?: string}): string {
  if (response.text) {
    return response.text;
  }
  return JSON.stringify(response.body);
}

export type CifasReference = {referenceCode: string; description: string};

export interface CifasSearchRequestBody {
  memberReferenceNumber: string;
  search: Record<string, string | object>;
}

/** "SearchResponseModel" in the NFD Search API v1 */
interface CifasSearchResponseBody {
  findSearchReference: number;
  memberSearchReference?: string;
  caseSearchResult: {
    casesMatched: number;
    unexecutedDmr: CifasReference[];
    matches?: Array<{
      case: Record<string, unknown> & {caseId: number};
      dmrOutcome: CifasReference[];
      priority: boolean;
    }>;
  };
  processingErrors?: string[];
}

/** "Case" in the NFD Search API v1 */
export interface CifasCaseBody extends Record<string, unknown> {
  caseId: number;
  filingReasons?: CifasReference[];
  subjects?: CifasSubject[];
}

interface CifasSubject {
  role: CifasReference;
  roleQualifier: CifasReference;

  firstName?: string;
  middleNames?: string;
  surname?: string;
  birthDate?: string;
  nationalInsuranceNumber?: string;

  employmentType?: CifasReference;

  homeTelephoneNumber?: string;
  mobileTelephoneNumber?: string;
  workTelephoneNumber?: string;
  employerTelephoneNumber?: string;
  emailAddress?: string;
  vehicleRegistrationNumber?: string;
  vehicleIdentificationNumber?: string;
  companyName?: string;
  companyNumber?: string;
  vatNumber?: string;
  websiteAddress?: string;

  addresses?: CifasSubjectAddress[];
  financeDetails?: CifasFinanceDetail[];
  documents?: CifasDocumentOutput[];

  withholdSubjectAccess?: boolean;
}

interface CifasSubjectAddress {
  addressType: CifasReference;
  flatOrUnit?: string;
  houseName?: string;
  houseNumber?: string;
  streetName?: string;
  district?: string;
  town?: string;
  county?: string;
  postcode?: string;
  timeAtAddress?: CifasTimeAt;
}

interface CifasFinanceDetail {
  type: 'bankOrBuildingSocietyAccount' | 'paymentCard';
  relevance: CifasReference;
  timeWithInstitution?: CifasTimeAt;
}

interface CifasDocumentOutput {
  copyAvailable: CifasReference;
  documentType: CifasReference;
  documentQualifier: CifasReference;
  nationality?: CifasReference;
  reference: string;
}

interface CifasTimeAt {
  format: {
    referenceCode: string;
    description: string;
  };
  year: number;
  month?: number;
}
