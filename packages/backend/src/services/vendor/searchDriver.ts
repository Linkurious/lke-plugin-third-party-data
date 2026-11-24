import {VendorResult} from '../../../../shared/api/response';
import {AbstractFields} from '../../../../shared/vendor/vendorModel';
import {VendorContext} from '../../../../shared/vendor/vendorContext';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';
import {DetailsOptions} from '../../models/detailsOptions';

export interface SearchDriver<
  SearchQuery extends AbstractFields = AbstractFields,
  SearchNodeResult extends AbstractFields = AbstractFields,
  EdgeResult extends AbstractFields = AbstractFields
> {
  readonly vendorKey: string;
  testConnection(integration: VendorIntegration): Promise<void>;
  search(
    searchQuery: SearchQuery,
    integration: VendorIntegration,
    maxResults: number,
    context: VendorContext
  ): Promise<VendorResult<SearchNodeResult, EdgeResult>[]>;
}

export interface DetailsSearchDriver<
  SearchQuery extends AbstractFields = AbstractFields,
  SearchNodeResult extends AbstractFields = AbstractFields,
  DetailsNodeResult extends AbstractFields = AbstractFields,
  EdgeResult extends AbstractFields = AbstractFields
> extends SearchDriver<SearchQuery, SearchNodeResult, EdgeResult> {
  getDetails(
    integration: VendorIntegration,
    detailsOptions: DetailsOptions,
    context: VendorContext
  ): Promise<VendorResult<DetailsNodeResult, EdgeResult>>;
}
