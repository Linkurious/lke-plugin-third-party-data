import {VENDOR_MAP} from './vendorMap';

export type IntegrationVendorKey = keyof typeof VENDOR_MAP;

export interface InternalVendorModel {
  readonly name: string;
  readonly description: string;
  readonly searchQueryFields: VendorField[];
  readonly searchResponseFields: VendorField[];
  readonly detailsResponseFields: VendorField[];
  readonly adminFields: VendorAdminField[];
}

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
