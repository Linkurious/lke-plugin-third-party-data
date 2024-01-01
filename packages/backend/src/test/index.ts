import {AnnuaireEntreprisesDataGouvFr} from '../services/vendor/driver/annuaireEntreprisesDataGouvFr';
import {Vendor} from '../../../shared/vendor/vendor';
import {VendorIntegration} from '../../../shared/integration/vendorIntegration';

const d = new AnnuaireEntreprisesDataGouvFr();
void d
  .search(
    {q: 'test'},
    {vendor: {key: 'recherche-entreprise-gouv-fr'} as Vendor} as VendorIntegration,
    1
  )
  .then((r) => console.log(JSON.stringify(r, null, 2)));
