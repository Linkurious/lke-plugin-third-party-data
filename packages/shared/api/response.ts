import {IntegrationVendorKey, VendorFieldType} from '../vendor/vendorModel';

export interface ApiError {
  code: string;
  message: string;
}

export interface VendorSearchResult {
  id: string;
  properties: Record<string, VendorFieldType>;
}

export interface VendorSearchResponse {
  integrationId: string;
  inputNodeId: string;
  vendorKey: IntegrationVendorKey;
  results: VendorSearchResult[];
  error?: ApiError;
}
