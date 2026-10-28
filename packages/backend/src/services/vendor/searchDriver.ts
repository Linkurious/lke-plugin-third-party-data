import {VendorResult} from '../../../../shared/api/response';
import {AbstractFields} from '../../../../shared/vendor/vendorModel';
import {VendorContext} from '../../../../shared/vendor/vendorContext';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';
import {DetailsOptions} from '../../models/detailsOptions';

export interface SearchDriver<
  SQ extends AbstractFields = AbstractFields,
  SNR extends AbstractFields = AbstractFields,
  DER extends AbstractFields = AbstractFields
> {
  readonly vendorKey: string;
  search(
    searchQuery: SQ,
    integration: VendorIntegration,
    maxResults: number,
    context: VendorContext
  ): Promise<VendorResult<SNR, DER>[]>;
}

export interface DetailsSearchDriver<
  SQ extends AbstractFields = AbstractFields,
  SNR extends AbstractFields = AbstractFields,
  DNR extends AbstractFields = AbstractFields,
  DER extends AbstractFields = AbstractFields
> extends SearchDriver<SQ, SNR, DER> {
  getDetails(
    integration: VendorIntegration,
    detailsOptions: DetailsOptions,
    context: VendorContext
  ): Promise<VendorResult<DNR, DER>>;
}
