import {it, describe} from 'node:test';
import * as assert from 'node:assert';

import {fixLinks} from '../services/vendor/driver/companyHouseUkDriver';

void describe('Company-House-UK', () => {
  void describe('fixLinks', () => {
    void it('should prefix "links_" properties', async () => {
      const properties = {
        links_officer_appointments: '/officers/nRktjmXhz7xClHOdBOxdPG0pwRA/appointments',
        date_of_birth_year: 1974,
        country_of_residence: 'USA'
      };
      const fixed = fixLinks(properties);
      assert.deepEqual(fixed, {
        links_officer_appointments:
          'https://find-and-update.company-information.service.gov.uk/officers/nRktjmXhz7xClHOdBOxdPG0pwRA/appointments',
        date_of_birth_year: 1974,
        country_of_residence: 'USA'
      });
    });
  });
});
