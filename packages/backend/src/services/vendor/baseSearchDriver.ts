import * as superagent from 'superagent';

import {VendorFieldType} from '../../../../shared/vendor/vendorModel';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';
import {VendorSearchResult} from '../../../../shared/api/response';

import {SearchDriver} from './searchDriver';

export abstract class BaseSearchDriver implements SearchDriver {
  public readonly vendorKey: string;
  protected readonly client: typeof superagent;

  protected constructor(vendorKey: string) {
    this.vendorKey = vendorKey;
    this.client = superagent;
  }

  abstract search(
    searchQuery: Record<string, VendorFieldType>,
    integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorSearchResult[]>;
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
    const prefix = key + '.';
    for (const [subKey, subValue] of Object.entries(value)) {
      if (subValue !== null && typeof subValue === 'object') {
        flattenJsonField(result, prefix + subKey, subValue as Record<string, unknown>);
      } else if (subValue !== null && subValue !== undefined) {
        result[prefix + subKey] = subValue as VendorFieldType;
      }
    }
  }
}
