export type VendorModel<
  SQ extends AbstractFields,
  SR extends AbstractFields,
  DR extends AbstractFields | NonNullable<unknown> = NonNullable<unknown>
> = VendorModelSearch<SQ, SR> | VendorModelSearchAndDetails<SQ, SR, DR>;

export interface BaseVendorModel<
  T extends VendorStrategy,
  SQ extends AbstractFields,
  SR extends AbstractFields,
  DR extends AbstractFields | NonNullable<unknown> = NonNullable<unknown>
> {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly strategy: T;
  readonly searchQueryFields: FieldsDescription<SQ>;
  readonly searchResponseFields: FieldsDescription<SR>;
  readonly adminFields: VendorAdminField[];
  readonly detailsResponseFields?: FieldsDescription<DR>;
}

export interface VendorModelSearch<SQ extends AbstractFields, SR extends AbstractFields>
  extends BaseVendorModel<'search', SQ, SR> {
  readonly detailsResponseFields?: undefined;
}

export interface VendorModelSearchAndDetails<
  SQ extends AbstractFields,
  SR extends AbstractFields,
  DR extends AbstractFields
> extends BaseVendorModel<'searchAndDetails', SQ, SR, DR> {
  readonly detailsResponseFields: FieldsDescription<DR>;
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

export type AbstractFields = {[key: string]: VendorFieldType | undefined};

type FieldsDescription<ObjectFormat extends AbstractFields> = {
  [K in keyof ObjectFormat]: {
    type: ObjectFormat[K] extends string | undefined
      ? 'string'
      : ObjectFormat[K] extends number | undefined
        ? 'number'
        : ObjectFormat[K] extends boolean | undefined
          ? 'boolean'
          : never;
    required: ObjectFormat[K] extends NonNullable<unknown> ? true : false;
  };
};

export function toVendorFields<T extends AbstractFields, K extends keyof FieldsDescription<T>>(
  fs: FieldsDescription<T>
): VendorField[] {
  return Object.entries(fs).map(([key, field]) => ({
    key: key,
    type: (field as FieldsDescription<T>[K]).type as VendorFieldTypeName,
    required: (field as FieldsDescription<T>[K]).required
  }));
}
