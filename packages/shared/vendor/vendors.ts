import {AnnuaireEntreprisesVendor} from './vendors/annuaireEntreprisesDataGouvFr';
import {Vendor} from './vendor';

const VENDORS: Vendor[] = [
  new AnnuaireEntreprisesVendor()
  /*, new DnbPersonLookupVendor()*/ // add it back when it's tested
];

export class Vendors {
  static getVendorByKey(key: string): Vendor {
    const vendor = VENDORS.find((v) => v.key === key);
    if (!vendor) {
      throw new Error(`Vendor with key ${key} not found`);
    }
    return vendor;
  }

  static getVendors(): Vendor[] {
    return VENDORS;
  }
}
