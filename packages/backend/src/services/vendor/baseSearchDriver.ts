import process from 'node:process';

import superagent, {SuperAgentRequest} from 'superagent';
import {HttpsProxyAgent} from 'https-proxy-agent';

import {AbstractFields, VendorFieldType} from '../../../../shared/vendor/vendorModel';
import {VendorResult} from '../../../../shared/api/response';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';
import {Vendor} from '../../../../shared/vendor/vendor';
import {DetailsOptions} from '../../models/detailsOptions';
import {Logger, WithLogger} from '../logger';

import {DetailsSearchDriver, SearchDriver} from './searchDriver';

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

export abstract class BaseSearchDriver<SQ extends AbstractFields, SR extends AbstractFields>
  extends ProxyClient
  implements SearchDriver<SQ, SR>
{
  public readonly vendorKey: string;

  protected constructor(vendor: Vendor<SQ, SR>) {
    super();
    this.vendorKey = vendor.key;
  }

  abstract search(
    searchQuery: SQ,
    integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorResult<SR>[]>;
}

export abstract class BaseDetailsSearchDriver<
    SQ extends AbstractFields,
    SR extends AbstractFields,
    DR extends AbstractFields
  >
  extends ProxyClient
  implements DetailsSearchDriver<SQ, SR, DR>
{
  public readonly vendorKey: string;

  protected constructor(vendor: Vendor<SQ, SR>) {
    super();
    this.vendorKey = vendor.key;
  }

  abstract search(
    searchQuery: SQ,
    integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorResult<SR>[]>;

  abstract getDetails(
    integration: VendorIntegration,
    detailsOptions: DetailsOptions
  ): Promise<VendorResult<DR>>;
}

export function flattenJson(json: Record<string, unknown>): Record<string, VendorFieldType> {
  const result: Record<string, VendorFieldType> = {};
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
