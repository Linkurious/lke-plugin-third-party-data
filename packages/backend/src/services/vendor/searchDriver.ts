import {VendorSearchResult} from '../../../../shared/api/response';
import {AbstractFields} from '../../../../shared/vendor/vendorModel';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';

export interface SearchDriver<
  SQ extends AbstractFields = AbstractFields,
  SR extends AbstractFields = AbstractFields
> {
  readonly vendorKey: string;
  search(
    searchQuery: SQ,
    integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorSearchResult<SR>[]>;
}
