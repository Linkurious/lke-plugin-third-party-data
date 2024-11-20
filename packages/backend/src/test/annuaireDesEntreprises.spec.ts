import {it, describe} from 'node:test';
import * as assert from 'node:assert';

import {AnnuaireEntreprisesDriver} from '../services/vendor/driver/annuaireEntreprisesDriver';
import {Vendor} from '../../../shared/vendor/vendor';
import {VendorIntegration} from '../../../shared/integration/vendorIntegration';

void describe('Annuaire-des-Entreprises', () => {
  void it('should find one results when searching for "test"', async () => {
    const d = new AnnuaireEntreprisesDriver();
    const results = await d.search(
      {q: 'test'},
      {vendor: {key: 'recherche-entreprise-gouv-fr'} as Vendor} as VendorIntegration,
      1
    );
    //console.log(JSON.stringify(results, null, 2));
    assert.deepEqual(results.length === 1, true);
  });
});
