import {IntegrationVendorKey, InternalVendorModel} from './vendorModel';
import {VENDOR_MAP} from './vendorMap';

export type VendorModel = InternalVendorModel & {key: IntegrationVendorKey};

export class Vendor {
  getVendorByKey(key: IntegrationVendorKey): VendorModel {
    return {...VENDOR_MAP[key], key: key};
  }

  getVendors(): VendorModel[] {
    return Object.entries(VENDOR_MAP).map(([key, vendor]) => ({
      ...vendor,
      key: key as IntegrationVendorKey
    }));
  }
}
