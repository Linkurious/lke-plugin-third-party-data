import {createHash} from 'node:crypto';
import {Buffer} from 'node:buffer';
import * as process from 'node:process';

import {Response} from 'superagent';

import {NeighborResult, VendorResult} from '../../../../../shared/api/response';
import {BaseDetailsSearchDriver, flattenJson} from '../baseSearchDriver';
import {VendorIntegration} from '../../../../../shared/integration/vendorIntegration';
import {
  Cifas,
  CifasDetailsResponse,
  CifasSearchQuery,
  CifasSearchResponse
} from '../../../../../shared/vendor/vendors/cifas';
import {DetailsOptions} from '../../../models/detailsOptions';
import {AbstractFields} from '../../../../../shared/vendor/vendorModel';
import {VendorContext} from '../../../../../shared/vendor/vendorContext';

// LKE-14966 - training environment
const CIFAS_BASE_URL = 'https://trainingapi.cifas.org.uk';
// const CIFAS_BASE_URL = 'https://api.cifas.org.uk/';
const CIFAS_CURRENT_USER = 'Linkurious_API';

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
    maxResults: number,
    _context: VendorContext
  ): Promise<VendorResult<CifasSearchResponse, CifasEdgeProperties>[]> {
    void _context;
    const url = new URL('/v1/NFD/Search', CIFAS_BASE_URL);
    const result = await this.call<CifasSearchResponseBody>(
      integration,
      url,
      'post',
      buildCifasSearchBody(searchQuery, integration)
    );
    if (result.processingErrors?.length) {
      this.logger.warn(`CIFAS processing errors: ${result.processingErrors.join(', ')}`);
    }
    // keep the order returned by CIFAS: it reflects their prioritisation
    return (result.caseSearchResult.matches ?? []).slice(0, maxResults).map((match) => ({
      id: `${match.case.caseId}`,
      properties: flattenJson(match.case) as CifasSearchResponse,
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
    const url = new URL(`/v1/NFD/Cases/${caseId}`, CIFAS_BASE_URL);
    const cifasCase = await this.call<CifasCaseBody>(integration, url, 'get');

    const edgeProperties: CifasEdgeProperties = {
      caseId: cifasCase.caseId,
      requestedAt: context.requestedAt.toISOString()
    };
    if (context.user) {
      edgeProperties.requestedBy = context.user.username;
    }

    return {
      id: `${cifasCase.caseId}`,
      properties: toCaseProperties(cifasCase),
      keyProperty: 'caseId',
      edgeKeyProperty: 'caseId',
      edgeProperties: edgeProperties,
      neighbors: extractCifasSubjectNeighbors(cifasCase)
    };
  }

  private async call<T>(
    integration: VendorIntegration,
    url: URL,
    verb: 'get' | 'post',
    body?: unknown
  ): Promise<T> {
    // the PFX certificate is stored as a base64 string in the plugin configuration
    const pfx = Buffer.from(integration.getAdminSettings('pfxCertificate') as string, 'base64');
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
      .set('X-CurrentUser', CIFAS_CURRENT_USER);
    if (body !== undefined) {
      void request.send(body as object);
    }

    let response: Response;
    try {
      response = await request;
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
    if (response.status !== 200) {
      throw new Error(`CIFAS request failed (${response.status}): ${describeBody(response)}`);
    }
    return response.body as T;
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
  for (const [key, value] of Object.entries(searchQuery)) {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      // TODO process each property to build objects from flatten properties
      if (key === 'city') {
        search['addresses'] = [
          {
            format: 'structuredAddress',
            city: `${value}`.trim(),
            locationAlerts: false
          }
        ];
      } else {
        search[key] = `${value}`.trim();
      }
    }
  }
  if (Object.keys(search).length === 0) {
    throw new Error('CIFAS: at least one search criterion is required');
  }
  return {
    memberReferenceNumber: integration.getAdminSettings('managingMemberNumber') as string,
    search: search
  };
}

export function buildCifasSubjectId(
  caseId: unknown,
  firstName: unknown,
  surname: unknown,
  birthDate: unknown
): string {
  const payload =
    normalizeString(caseId) +
    normalizeString(firstName) +
    normalizeString(surname) +
    normalizeDateLike(birthDate);
  return createHash('sha256').update(payload).digest('hex');
}

function normalizeString(value: unknown): string {
  if (typeof value === 'number') {
    return `${value}`;
  }
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

function normalizeDateLike(value: unknown): string {
  const sDate = normalizeString(value);
  if (!sDate) {
    return '';
  }
  const date = new Date(sDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

/** the case properties, without the subjects (they are returned as neighbors) */
export function toCaseProperties(cifasCase: CifasCaseBody): CifasDetailsResponse {
  const {subjects, filingReasons, ...rest} = cifasCase;
  void subjects;
  const properties = flattenJson(rest);
  properties.filingReasons = formatReferences(filingReasons);
  return properties as unknown as CifasDetailsResponse;
}

function formatReferences(references: CifasRef[] | undefined): string {
  return (references ?? []).map((r) => `${r.referenceCode} - ${r.description}`).join('\n');
}

export function extractCifasSubjectNeighbors(cifasCase: CifasCaseBody): NeighborResult[] {
  return (cifasCase.subjects ?? [])
    .filter((subject) => typeof subject === 'object' && subject !== null)
    .map((subject) => {
      const properties = flattenJson(subject) as Record<string, string | number | boolean>;
      properties.subjectId = buildCifasSubjectId(
        cifasCase.caseId,
        subject.firstName,
        subject.surname,
        subject.birthDate
      );
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

type CifasRef = {referenceCode: string; description: string};

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
    unexecutedDmr: CifasRef[];
    matches?: Array<{
      case: Record<string, unknown> & {caseId: number};
      dmrOutcome: CifasRef[];
      priority: boolean;
    }>;
  };
  processingErrors?: string[];
}

/** "Case" in the NFD Search API v1 */
export interface CifasCaseBody extends Record<string, unknown> {
  caseId: number;
  filingReasons?: CifasRef[];
  subjects?: Array<Record<string, unknown>>;
}
