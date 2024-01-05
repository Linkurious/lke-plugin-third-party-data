import {STRINGS} from '../strings';

import {VendorIntegrationPublic} from './vendorIntegrationPublic';
import {IntegrationModel} from './IntegrationModel';

export class VendorIntegration extends VendorIntegrationPublic<IntegrationModel> {
  constructor(model: IntegrationModel) {
    super(model);
  }

  getAdminSettings(key: string): string {
    const value = this.model.adminSettings[key];
    if (value === undefined) {
      throw new Error(STRINGS.errors.missingAdminSetting(this.vendor, key));
    }
    return value;
  }
}
