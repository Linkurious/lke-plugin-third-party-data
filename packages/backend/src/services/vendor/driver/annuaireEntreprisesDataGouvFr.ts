import {VendorFieldType} from '../../../../../shared/vendor/vendorModel';
import {VendorIntegration} from '../../../../../shared/integration/vendorIntegration';
import {VendorSearchResult} from '../../../../../shared/api/response';
import {BaseSearchDriver, flattenJson} from '../baseSearchDriver';

export class AnnuaireEntreprisesDataGouvFr extends BaseSearchDriver {
  constructor() {
    super('annuaire-entreprises-data-gouv-fr');
  }

  /**
   * https://recherche-entreprises.api.gouv.fr/docs/#tag/Recherche-textuelle/paths/~1search/get
   */
  async search(
    searchQuery: Record<string, VendorFieldType>,
    _integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorSearchResult[]> {
    const url = new URL('https://recherche-entreprises.api.gouv.fr/search');
    for (const [key, value] of Object.entries(searchQuery)) {
      url.searchParams.append(key, `${value}`);
    }
    url.searchParams.set('page', '1');
    url.searchParams.set('per_page', `${maxResults}`);
    const r = await this.client.get(url.toString()).set('accept', 'json');
    if (r.status !== 200) {
      throw new Error(`Failed to get search results: ${(r.body as ResponseBody).erreur}`);
    }
    return (r.body as ResponseBody).results.map((res) => {
      return {
        id: `siren:${res.siren as string}`,
        properties: flattenJson(res)
      };
    });
  }
}

interface ResponseBody {
  total_results: number;
  page: number;
  per_page: number;
  results: Record<string, unknown>[];
  erreur: string | undefined;
}
