import process from 'node:process';
import fs from 'node:fs';

import {Agent, RequestInit, fetch} from 'undici';
import superagent, {SuperAgentRequest} from 'superagent';
import {HttpsProxyAgent} from 'https-proxy-agent';

import {AbstractFields, VendorFieldType} from '../../../../shared/vendor/vendorModel';
import {VendorContext} from '../../../../shared/vendor/vendorContext';
import {VendorResult} from '../../../../shared/api/response';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';
import {Vendor} from '../../../../shared/vendor/vendor';
import {DetailsOptions} from '../../models/detailsOptions';
import {Logger, WithLogger} from '../logger';

import {DetailsSearchDriver, SearchDriver} from './searchDriver';

type CifasRef = {referenceCode: string; description: string};
export interface CifasCaseMatch {
  case: {
    caseId: number;
    owningMember: CifasRef;
    managingMember: CifasRef;
    caseType: CifasRef;
    product: CifasRef;
    supplyDate: string; // iso
    applicationDate: string; // iso
    claimDate: string; // iso
    dmrOutcome: Array<CifasRef>;
    priority: boolean;
  };
}
export interface CifasSearchResult {
  caseSearchResult: {
    casesMatched: number;
    unexecutedDmr: Array<CifasRef>;
    cases: Array<CifasCaseMatch>;
  };
}
// https://portal.cifas.org.uk/en-GB/Support/SearchDocumentation
const agent = new Agent({
  connect: {
    pfx: fs.readFileSync('/Users/david.rapin/Downloads/cifas-2026-test.pfx'),
    passphrase: '???'
  }
});
export function fetchWithClientCertificate(
  path: string,
  params: Record<string, string>,
  body: unknown,
  method: 'POST' | 'GET' = 'GET'
): Promise<Response> {
  const init: RequestInit = {
    method: method,
    dispatcher: agent,
    headers: {
      // Cifas-specific
      'X-RequestingInstitution': '555',
      'X-OwningMemberNumber': '555',
      'X-ManagingMemberNumber': '555',
      'X-CurrentUser': 'Linkurious_API',
      // other
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  };
  const url = new URL(path, 'https://trainingapi.cifas.org.uk');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  console.log(`Querying ${method} ${url.toString()}`);
  return fetch(url, init);
}

export class ProxyClient extends WithLogger {
  private readonly client: typeof superagent;

  constructor(private readonly env = process.env) {
    super(new Logger());
    this.client = superagent;
  }

  /**
   * Uses a proxy if needed
   */
  protected request(url: URL, verb: 'get' | 'post' = 'get'): SuperAgentRequest {
    let proxyUrl: string | undefined;

    if (url.protocol === 'https:') {
      proxyUrl = this.env.HTTPS_PROXY ?? this.env.https_proxy;
      if (proxyUrl) {
        if (!proxyUrl.startsWith('http:')) {
          proxyUrl = `http://${proxyUrl}`;
        }
        this.logger.info(`HTTP Client: using HTTPS proxy ${proxyUrl}`);
      }
    }

    const sUrl = url.toString();
    const request = this.client[verb](sUrl);
    if (proxyUrl) {
      this.logger.info(`HTTP Client: Sending "${verb}" request (via proxy) to ${sUrl}`);
      return request.agent(new HttpsProxyAgent(proxyUrl));
    } else {
      this.logger.info(`HTTP Client: Sending "${verb}" request to ${sUrl}`);
      return request;
    }
  }
}

export abstract class BaseSearchDriver<
  SQ extends AbstractFields,
  SNR extends AbstractFields,
  DER extends AbstractFields = AbstractFields
>
  extends ProxyClient
  implements SearchDriver<SQ, SNR, DER>
{
  public readonly vendorKey: string;

  protected constructor(vendor: Vendor<SQ, SNR>) {
    super();
    this.vendorKey = vendor.key;
  }

  abstract search(
    searchQuery: SQ,
    integration: VendorIntegration,
    maxResults: number,
    context: VendorContext
  ): Promise<VendorResult<SNR, DER>[]>;
}

export abstract class BaseDetailsSearchDriver<
  SQ extends AbstractFields,
  SNR extends AbstractFields,
  DNR extends AbstractFields,
  DER extends AbstractFields = AbstractFields
>
  extends ProxyClient
  implements DetailsSearchDriver<SQ, SNR, DNR, DER>
{
  public readonly vendorKey: string;

  protected constructor(vendor: Vendor<SQ, SNR>) {
    super();
    this.vendorKey = vendor.key;
  }

  abstract search(
    searchQuery: SQ,
    integration: VendorIntegration,
    maxResults: number,
    context: VendorContext
  ): Promise<VendorResult<SNR, DER>[]>;

  abstract getDetails(
    integration: VendorIntegration,
    detailsOptions: DetailsOptions,
    context: VendorContext
  ): Promise<VendorResult<DNR, DER>>;
}

export function flattenJson(json: unknown): Record<string, VendorFieldType> {
  const result: Record<string, VendorFieldType> = {};
  if (typeof json !== 'object' || json === null) {
    return result;
  }
  for (const [key, value] of Object.entries(json)) {
    if (value !== null && typeof value === 'object') {
      flattenJsonField(result, key, value as Record<string, unknown>);
    } else if (value !== null && value !== undefined) {
      result[key] = value as VendorFieldType;
    }
  }
  return result;
}

function flattenJsonField(
  result: Record<string, VendorFieldType>,
  key: string,
  value: Record<string, unknown>
): void {
  if (Array.isArray(value)) {
    // empty array
    if (!value.length) {
      return;
    }

    // array of strings
    if (typeof value[0] === 'string') {
      result[key] = value.join(', ');
      return;
    }

    // array of objects
    if (typeof value[0] === 'object' && value[0] !== null) {
      result[key] = value
        .map((entry) => JSON.stringify(entry, null, 1).slice(3, -1).replaceAll('\n "', '\n"'))
        .join('\n\n');
    }
  } else {
    const prefix = key + '_';
    for (const [subKey, subValue] of Object.entries(value)) {
      if (subValue !== null && typeof subValue === 'object') {
        flattenJsonField(result, prefix + subKey, subValue as Record<string, unknown>);
      } else if (subValue !== null && subValue !== undefined) {
        result[prefix + subKey] = subValue as VendorFieldType;
      }
    }
  }
}
