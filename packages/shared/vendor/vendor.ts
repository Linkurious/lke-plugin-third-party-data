import {
  VendorModel,
  VendorAdminField,
  VendorField,
  VendorStrategy,
  AbstractFields,
  toVendorFields
} from './vendorModel';

export class Vendor<
  SQ extends AbstractFields = AbstractFields,
  SR extends AbstractFields = AbstractFields,
  DR extends AbstractFields = NonNullable<unknown>
> {
  private readonly model: VendorModel<SQ, SR, DR>;

  constructor(model: VendorModel<SQ, SR, DR>) {
    this.model = model;
  }

  get adminFields(): VendorAdminField[] {
    return this.model.adminFields;
  }
  get description(): string {
    return this.model.description;
  }

  get key(): string {
    return this.model.key;
  }
  get name(): string {
    return this.model.name;
  }
  get searchQueryFields(): VendorField[] {
    return toVendorFields(this.model.searchQueryFields);
  }
  get searchResponseFields(): VendorField[] {
    return toVendorFields(this.model.searchResponseFields);
  }
  get strategy(): VendorStrategy {
    return this.model.strategy;
  }
  get outputFields(): VendorField[] {
    return this.model.strategy === 'search'
      ? toVendorFields(this.model.searchResponseFields)
      : toVendorFields(this.model.detailsResponseFields);
  }
}
