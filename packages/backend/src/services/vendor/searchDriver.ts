import {VendorSearchResult} from '../../../../shared/api/response';
import {VendorFieldType} from '../../../../shared/vendor/vendorModel';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';

export interface SearchDriver {
  readonly vendorKey: string;
  search(
    searchQuery: Record<string, VendorFieldType>,
    integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorSearchResult[]>;
}
