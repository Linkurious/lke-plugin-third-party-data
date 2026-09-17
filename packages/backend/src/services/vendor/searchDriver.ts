import {VendorResult} from '../../../../shared/api/response';
import {AbstractFields} from '../../../../shared/vendor/vendorModel';
import {VendorContext} from '../../../../shared/vendor/vendorContext';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';
import {DetailsOptions} from '../../models/detailsOptions';

export interface SearchDriver<
  SQ extends AbstractFields = AbstractFields,
  SR extends AbstractFields = AbstractFields,
  ER extends AbstractFields = AbstractFields
> {
  readonly vendorKey: string;
  search(
    searchQuery: SQ,
    integration: VendorIntegration,
    maxResults: number,
    context: VendorContext
  ): Promise<VendorResult<SR, ER>[]>;
}

export interface DetailsSearchDriver<
  SQ extends AbstractFields = AbstractFields,
  SR extends AbstractFields = AbstractFields,
  DR extends AbstractFields = AbstractFields,
  ER extends AbstractFields = AbstractFields
> extends SearchDriver<SQ, SR, ER> {
  getDetails(
    integration: VendorIntegration,
    detailsOptions: DetailsOptions,
    context: VendorContext
  ): Promise<VendorResult<DR, ER>>;
}
