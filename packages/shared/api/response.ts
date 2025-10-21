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

export interface ApiResponse {
  error?: ApiError;
}

export interface NeighborResult {
  edgeType: string;
  nodeCategory: string;
  properties: Record<string, string | number | boolean>;
}

export interface VendorResult<R extends AbstractFields = AbstractFields> {
  id: string;
  properties: R;
  neighbors?: NeighborResult[];
}

export interface VendorSearchResponse<R extends AbstractFields = AbstractFields>
  extends ApiResponse {
  integrationId: string;
  inputNodeId: string;
  vendorKey: string;
  results: VendorResult<R>[];
}

export interface VendorDetailsResponse<R extends AbstractFields = AbstractFields>
  extends ApiResponse {
  integrationId: string;
  searchResultId: string;
  vendorKey: string;
  result?: VendorResult<R>;
}
