export type VendorModel = VendorModelSearch | VendorModelSearchAndDetails;

export interface BaseVendorModel<T extends VendorStrategy> {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly strategy: T;
  readonly searchQueryFields: VendorField[];
  readonly searchResponseFields: VendorField[];
  readonly adminFields: VendorAdminField[];
  readonly detailsResponseFields?: undefined | VendorField[];
}
export interface VendorModelSearch extends BaseVendorModel<'search'> {
  readonly detailsResponseFields?: undefined;
}
export interface VendorModelSearchAndDetails extends BaseVendorModel<'searchAndDetails'> {
  readonly detailsResponseFields: VendorField[];
}

export type VendorStrategy = 'search' | 'searchAndDetails';
export type VendorFieldTypeName = 'string' | 'number' | 'boolean';
export type VendorFieldType = string | number | boolean;

interface BaseVendorField<T extends VendorFieldTypeName> {
  key: string;
  type: T;
  required?: boolean;
}

export type VendorField =
  | BaseVendorField<'string'>
  | BaseVendorField<'number'>
  | BaseVendorField<'boolean'>;

export interface VendorAdminField {
  key: string;
  name: string;
  required?: boolean;
  enum?: string[];
}
