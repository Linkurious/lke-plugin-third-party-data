import {STRINGS} from '../strings';

import {VendorIntegrationPublic} from './vendorIntegrationPublic';
import {IntegrationModel} from './IntegrationModel';

export class VendorIntegration extends VendorIntegrationPublic<IntegrationModel> {
  constructor(model: IntegrationModel) {
    super(model);
  }

  getAdminSettings(key: string): string | boolean | undefined {
    const value = this.model.adminSettings[key];
    if (value === undefined) {
      const field = this.vendor.adminFields.find((field) => field.key === key);
      if (!field) {
        throw new Error(STRINGS.errors.unknownAdminSetting(this.vendor, key));
      }
      if (field.required) {
        throw new Error(STRINGS.errors.missingAdminSetting(this.vendor, key));
      }
      return undefined;
    }
    return value;
  }
}
