import {Vendor} from '../vendor';

export class AnnuaireEntreprisesVendor extends Vendor<
  AnnuaireEntreprisesSearchQuery,
  AnnuaireEntreprisesSearchResponse
> {
  constructor() {
    super({
      key: 'annuaire-entreprises-data-gouv-fr',
      name: 'Annuaire des Entreprises',
      strategy: 'search',
      description: `Search for companies in the French Government's "Annuaire des Entreprises" database, see <a target="_blank" href="https://annuaire-entreprises.data.gouv.fr/">details</a>`,
      searchQueryFields: {
        q: {type: 'string', required: true},
        code_postal: {type: 'string', required: false},
        departement: {type: 'string', required: false},
        est_association: {type: 'boolean', required: false},
        est_ess: {type: 'boolean', required: false},
        est_entrepreneur_individuel: {type: 'boolean', required: false},
        etat_administratif: {type: 'string', required: false},
        nom_personne: {type: 'string', required: false},
        prenom_personne: {type: 'string', required: false},
        ca_min: {type: 'number', required: false},
        resultat_net_min: {type: 'number', required: false}
      },
      searchResponseFields: {
        siren: {type: 'string', required: true},
        url: {type: 'string', required: true},
        nom_complet: {type: 'string', required: true},
        nom_raison_sociale: {type: 'string', required: true},
        nombre_etablissements: {type: 'number', required: true},
        nombre_etablissements_ouverts: {type: 'number', required: true},
        siege_activite_principale: {type: 'string', required: true},
        siege_adresse: {type: 'string', required: true},
        siege_caractere_employeur: {type: 'string', required: true},
        siege_code_postal: {type: 'string', required: true},
        siege_commune: {type: 'string', required: true},
        siege_coordonnees: {type: 'string', required: true},
        siege_date_creation: {type: 'string', required: true},
        siege_date_debut_activite: {type: 'string', required: true},
        siege_date_mise_a_jour: {type: 'string', required: true},
        siege_departement: {type: 'string', required: true},
        siege_est_siege: {type: 'boolean', required: true},
        siege_etat_administratif: {type: 'string', required: true},
        siege_geo_adresse: {type: 'string', required: true},
        siege_geo_id: {type: 'string', required: true},
        siege_latitude: {type: 'string', required: true},
        siege_libelle_commune: {type: 'string', required: true},
        siege_libelle_voie: {type: 'string', required: true},
        siege_longitude: {type: 'string', required: true},
        siege_numero_voie: {type: 'string', required: true},
        siege_region: {type: 'string', required: true},
        siege_siret: {type: 'string', required: true},
        siege_type_voie: {type: 'string', required: true},
        activite_principale: {type: 'string', required: true},
        categorie_entreprise: {type: 'string', required: true},
        caractere_employeur: {type: 'string', required: true},
        annee_categorie_entreprise: {type: 'string', required: true},
        date_creation: {type: 'string', required: true},
        date_mise_a_jour: {type: 'string', required: true},
        etat_administratif: {type: 'string', required: true},
        nature_juridique: {type: 'string', required: true},
        section_activite_principale: {type: 'string', required: true},
        statut_diffusion: {type: 'string', required: true},
        matching_etablissements: {type: 'string', required: true},
        complements_convention_collective_renseignee: {type: 'boolean', required: false},
        complements_egapro_renseignee: {type: 'boolean', required: false},
        complements_est_association: {type: 'boolean', required: false},
        complements_est_bio: {type: 'boolean', required: false},
        complements_est_entrepreneur_individuel: {type: 'boolean', required: false},
        complements_est_entrepreneur_spectacle: {type: 'boolean', required: false},
        complements_est_ess: {type: 'boolean', required: false},
        complements_est_finess: {type: 'boolean', required: false},
        complements_est_organisme_formation: {type: 'boolean', required: false},
        complements_est_qualiopi: {type: 'boolean', required: false},
        complements_est_rge: {type: 'boolean', required: false},
        complements_est_service_public: {type: 'boolean', required: false},
        complements_est_societe_mission: {type: 'boolean', required: false},
        complements_est_uai: {type: 'boolean', required: false}
      },
      adminFields: []
    });
  }
}

export type AnnuaireEntreprisesSearchQuery = {
  q: string;
  code_postal?: string;
  departement?: string;
  est_association?: boolean;
  est_ess?: boolean;
  est_entrepreneur_individuel?: boolean;
  etat_administratif?: string;
  nom_personne?: string;
  prenom_personne?: string;
  ca_min?: number;
  resultat_net_min?: number;
};

export type AnnuaireEntreprisesSearchResponse = {
  siren: string;
  url: string;
  nom_complet: string;
  nom_raison_sociale: string;
  nombre_etablissements: number;
  nombre_etablissements_ouverts: number;
  siege_activite_principale: string;
  siege_adresse: string;
  siege_caractere_employeur: string;
  siege_code_postal: string;
  siege_commune: string;
  siege_coordonnees: string;
  siege_date_creation: string;
  siege_date_debut_activite: string;
  siege_date_mise_a_jour: string;
  siege_departement: string;
  siege_est_siege: boolean;
  siege_etat_administratif: string;
  siege_geo_adresse: string;
  siege_geo_id: string;
  siege_latitude: string;
  siege_libelle_commune: string;
  siege_libelle_voie: string;
  siege_longitude: string;
  siege_numero_voie: string;
  siege_region: string;
  siege_siret: string;
  siege_type_voie: string;
  activite_principale: string;
  categorie_entreprise: string;
  caractere_employeur: string;
  annee_categorie_entreprise: string;
  date_creation: string;
  date_mise_a_jour: string;
  etat_administratif: string;
  nature_juridique: string;
  section_activite_principale: string;
  statut_diffusion: string;
  matching_etablissements: string;
  complements_convention_collective_renseignee?: boolean;
  complements_egapro_renseignee?: boolean;
  complements_est_association?: boolean;
  complements_est_bio?: boolean;
  complements_est_entrepreneur_individuel?: boolean;
  complements_est_entrepreneur_spectacle?: boolean;
  complements_est_ess?: boolean;
  complements_est_finess?: boolean;
  complements_est_organisme_formation?: boolean;
  complements_est_qualiopi?: boolean;
  complements_est_rge?: boolean;
  complements_est_service_public?: boolean;
  complements_est_societe_mission?: boolean;
  complements_est_uai?: boolean;
};
