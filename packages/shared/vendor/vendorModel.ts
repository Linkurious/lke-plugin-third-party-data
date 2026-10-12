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

export interface VendorModelSearch<
  SQ extends AbstractFields,
  SR extends AbstractFields
> extends BaseVendorModel<'search', SQ, SR> {
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
export type VendorFieldType = string | number | boolean | VendorFieldType[];

interface BaseVendorField<T extends VendorFieldTypeName> {
  key: string;
  type: T;
  array?: boolean;
  required?: boolean;
}

export type VendorField =
  | BaseVendorField<'string'>
  | BaseVendorField<'number'>
  | BaseVendorField<'boolean'>;

export type VendorAdminField =
  | BaseAdminField<'string', {enum?: string[]}>
  | BaseAdminField<'boolean', undefined>
  | BaseAdminField<'file', undefined>;
interface BaseAdminField<TYPE, OPTIONS> {
  type: TYPE;
  key: string;
  name: string;
  required?: boolean;
  options?: OPTIONS;
}

export type AbstractFields = {[key: string]: VendorFieldType | undefined};

type Flatten<T> = T extends (infer U)[] ? U : T;
type FieldDescriptionType<T> =
  Flatten<T> extends string | undefined
    ? 'string'
    : Flatten<T> extends number | undefined
      ? 'number'
      : Flatten<T> extends boolean | undefined
        ? 'boolean'
        : never;

type FieldDescription<T> = {
  type: FieldDescriptionType<T>;
  required: T extends NonNullable<unknown> ? true : false;
} & (T extends unknown[] | undefined ? {array: true} : {});

type FieldsDescription<ObjectFormat extends AbstractFields> = {
  [K in keyof ObjectFormat]: FieldDescription<ObjectFormat[K]>;
};

export function toVendorFields<T extends AbstractFields, K extends keyof FieldsDescription<T>>(
  fs: FieldsDescription<T>
): VendorField[] {
  return Object.entries(fs).map(([key, field]: [string, FieldsDescription<T>[K]]) => ({
    key: key,
    type: field.type as VendorFieldTypeName,
    array: 'array' in field ? field.array : false,
    required: field.required
  }));
}
