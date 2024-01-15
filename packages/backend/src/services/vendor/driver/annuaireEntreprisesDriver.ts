import {VendorResult} from '../../../../../shared/api/response';
import {BaseSearchDriver, flattenJson} from '../baseSearchDriver';
import {VendorIntegration} from '../../../../../shared/integration/vendorIntegration';
import {
  AnnuaireEntreprisesSearchQuery,
  AnnuaireEntreprisesSearchResponse,
  AnnuaireEntreprisesVendor
} from '../../../../../shared/vendor/vendors/annuaireEntreprisesDataGouvFr';

export class AnnuaireEntreprisesDriver extends BaseSearchDriver<
  AnnuaireEntreprisesSearchQuery,
  AnnuaireEntreprisesSearchResponse
> {
  constructor() {
    super(new AnnuaireEntreprisesVendor());
  }

  /**
   * https://recherche-entreprises.api.gouv.fr/docs/#tag/Recherche-textuelle/paths/~1search/get
   */
  async search(
    searchQuery: AnnuaireEntreprisesSearchQuery,
    _integration: VendorIntegration,
    maxResults: number
  ): Promise<VendorResult<AnnuaireEntreprisesSearchResponse>[]> {
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
        properties: flattenJson(res) as AnnuaireEntreprisesSearchResponse
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

/**
 * @example Response
 * {
 *   "siren": "521313106",
 *   "nom_complet": "TEST",
 *   "nom_raison_sociale": "TEST",
 *   "nombre_etablissements": 1,
 *   "nombre_etablissements_ouverts": 1,
 *   "siege_activite_principale": "96.09Z",
 *   "siege_adresse": "6 RUE DESIRE NIEL 06000 NICE",
 *   "siege_caractere_employeur": "N",
 *   "siege_code_postal": "06000",
 *   "siege_commune": "06088",
 *   "siege_coordonnees": "43.700003,7.276042",
 *   "siege_date_creation": "2010-04-01",
 *   "siege_date_debut_activite": "2010-04-01",
 *   "siege_date_mise_a_jour": "2010-03-26T08:56:23",
 *   "siege_departement": "06",
 *   "siege_est_siege": true,
 *   "siege_etat_administratif": "A",
 *   "siege_geo_adresse": "6 Rue Désiré Niel 06000 Nice",
 *   "siege_geo_id": "06088_1930_00006",
 *   "siege_latitude": "43.700003",
 *   "siege_libelle_commune": "NICE",
 *   "siege_libelle_voie": "DESIRE NIEL",
 *   "siege_longitude": "7.276042",
 *   "siege_numero_voie": "6",
 *   "siege_region": "93",
 *   "siege_siret": "52131310600010",
 *   "siege_type_voie": "RUE",
 *   "activite_principale": "96.09Z",
 *   "categorie_entreprise": "PME",
 *   "caractere_employeur": "N",
 *   "annee_categorie_entreprise": "2021",
 *   "date_creation": "2010-04-01",
 *   "date_mise_a_jour": "2017-05-20T01:21:43",
 *   "etat_administratif": "A",
 *   "nature_juridique": "5499",
 *   "section_activite_principale": "S",
 *   "statut_diffusion": "O",
 *   "matching_etablissements": "\"activite_principale\": \"96.09Z\",\n\"annee_tranche_effectif_salarie\": null,\n\"adresse\": \"6 RUE DESIRE NIEL 06000 NICE\",\n\"caractere_employeur\": \"N\",\n\"code_postal\": \"06000\",\n\"commune\": \"06088\",\n\"date_creation\": \"2010-04-01\",\n\"date_debut_activite\": \"2010-04-01\",\n\"est_siege\": true,\n\"etat_administratif\": \"A\",\n\"geo_id\": \"06088_1930_00006\",\n\"latitude\": \"43.700003\",\n\"libelle_commune\": \"NICE\",\n\"liste_enseignes\": null,\n\"liste_finess\": null,\n\"liste_id_bio\": null,\n\"liste_idcc\": null,\n\"liste_id_organisme_formation\": null,\n\"liste_rge\": null,\n\"liste_uai\": null,\n\"longitude\": \"7.276042\",\n\"nom_commercial\": null,\n\"region\": \"93\",\n\"siret\": \"52131310600010\",\n\"tranche_effectif_salarie\": null\n",
 *   "complements_convention_collective_renseignee": false,
 *   "complements_egapro_renseignee": false,
 *   "complements_est_association": false,
 *   "complements_est_bio": false,
 *   "complements_est_entrepreneur_individuel": false,
 *   "complements_est_entrepreneur_spectacle": false,
 *   "complements_est_ess": false,
 *   "complements_est_finess": false,
 *   "complements_est_organisme_formation": false,
 *   "complements_est_qualiopi": false,
 *   "complements_est_rge": false,
 *   "complements_est_service_public": false,
 *   "complements_est_societe_mission": false,
 *   "complements_est_uai": false
 * }
 */
