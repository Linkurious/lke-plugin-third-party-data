import {VendorResult} from '../../../../shared/api/response';
import {AbstractFields} from '../../../../shared/vendor/vendorModel';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';
import {DetailsOptions} from '../../models/detailsOptions';

export interface SearchDriver<
  SQ extends AbstractFields = AbstractFields,
  SR extends AbstractFields = AbstractFields
> {
  readonly vendorKey: string;
  search(
    searchQuery: SQ,
    integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorResult<SR>[]>;
}

export interface DetailsSearchDriver<
  SQ extends AbstractFields = AbstractFields,
  SR extends AbstractFields = AbstractFields,
  DR extends AbstractFields = AbstractFields
> extends SearchDriver<SQ, SR> {
  getDetails(
    integration: VendorIntegration,
    detailsOptions: DetailsOptions
  ): Promise<VendorResult<DR>>;
}
