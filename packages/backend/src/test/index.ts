import {AnnuaireEntreprisesDriver} from '../services/vendor/driver/annuaireEntreprisesDriver';
import {Vendor} from '../../../shared/vendor/vendor';
import {VendorIntegration} from '../../../shared/integration/vendorIntegration';

const d = new AnnuaireEntreprisesDriver();
void d
  .search(
    {q: 'test'},
    {vendor: {key: 'recherche-entreprise-gouv-fr'} as Vendor} as VendorIntegration,
    1
  )
  .then((r) => console.log(JSON.stringify(r, null, 2)));
