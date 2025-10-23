export interface IntegrationModelPublic {
  id: string;
  vendorKey: string;
  sourceKey: string;
  inputNodeCategory: string;
  searchQueryFieldMapping: FieldMapping[];
  searchResponseFieldSelection: string[];
  outputNodeCategory: string;
  outputEdgeType: string;
  outputNodeFieldMapping: FieldMapping[];
}

export interface IntegrationModel extends IntegrationModelPublic {
  adminSettings: Record<string, string | boolean | undefined>;
}

export type FieldMappingType = 'constant' | 'property';
export type ConstantFieldTypeName = 'number' | 'string' | 'boolean';

interface BaseQueryFieldMapping<T extends FieldMappingType> {
  outputPropertyKey: string;
  type: T;
}

interface BaseConstantFieldMapping<T extends ConstantFieldTypeName>
  extends BaseQueryFieldMapping<'constant'> {
  valueType: T;
  value: string | number | boolean;
}

interface ConstantStringFieldMapping extends BaseConstantFieldMapping<'string'> {
  value: string;
}

interface ConstantNumberFieldMapping extends BaseConstantFieldMapping<'number'> {
  value: number;
}

interface ConstantBooleanFieldMapping extends BaseConstantFieldMapping<'boolean'> {
  value: boolean;
}

export type ConstantFieldMapping =
  | ConstantStringFieldMapping
  | ConstantNumberFieldMapping
  | ConstantBooleanFieldMapping;

export interface PropertyFieldMapping extends BaseQueryFieldMapping<'property'> {
  inputPropertyKey: string;
}

export type FieldMapping = ConstantFieldMapping | PropertyFieldMapping;
