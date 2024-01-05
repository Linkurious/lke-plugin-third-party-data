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
  SR extends AbstractFields = AbstractFields
> {
  private readonly model: VendorModel<SQ, SR>;

  constructor(model: VendorModel<SQ, SR>) {
    this.model = model;
  }

  get adminFields(): VendorAdminField[] {
    return this.model.adminFields;
  }
  get description(): string {
    return this.model.description;
  }
  get detailsResponseFields(): VendorField[] | undefined {
    return this.model.detailsResponseFields;
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
      : this.model.detailsResponseFields;
  }
}
