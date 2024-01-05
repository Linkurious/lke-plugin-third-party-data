import {ItemTypeAccessRightType, PropertyTypeName} from '@linkurious/rest-client';

import {AbstractFields} from '../vendor/vendorModel';

export interface GraphItemSchema {
  itemType: string;
  access: ItemTypeAccessRightType;
  properties: GraphPropertySchema[];
}

export interface GraphPropertySchema {
  propertyKey: string;
  required: boolean;
  type: PropertyTypeName;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface VendorSearchResult<R extends AbstractFields = AbstractFields> {
  id: string;
  properties: R;
}

export interface VendorSearchResponse<R extends AbstractFields = AbstractFields> {
  integrationId: string;
  inputNodeId: string;
  vendorKey: string;
  results: VendorSearchResult<R>[];
  error?: ApiError;
}
