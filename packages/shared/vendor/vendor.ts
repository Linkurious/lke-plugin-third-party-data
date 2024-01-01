import {
  VendorModel,
  VendorAdminField,
  VendorField,
  BaseVendorModel,
  VendorStrategy
} from './vendorModel';

export class Vendor implements BaseVendorModel<VendorStrategy> {
  private readonly model: VendorModel;

  constructor(model: VendorModel) {
    this.model = model;
  }

  get adminFields(): VendorAdminField[] {
    return this.model.adminFields;
  }
  get description(): string {
    return this.model.description;
  }
  get detailsResponseFields(): VendorField[] | undefined {
    return this.model.detailsResponseFields;
  }
  get key(): string {
    return this.model.key;
  }
  get name(): string {
    return this.model.name;
  }
  get searchQueryFields(): VendorField[] {
    return this.model.searchQueryFields;
  }
  get searchResponseFields(): VendorField[] {
    return this.model.searchResponseFields;
  }
  get strategy(): VendorStrategy {
    return this.model.strategy;
  }
  get outputFields(): VendorField[] {
    return this.model.strategy === 'search'
      ? this.model.searchResponseFields
      : this.model.detailsResponseFields;
  }

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

const VENDORS: Vendor[] = [
  new Vendor({
    key: 'dnb-company',
    name: 'Dun & Bradstreet - Company',
    strategy: 'search',
    description:
      'Search for companies! see <a target="_blank" href="https://google.com">details</a>',
    searchQueryFields: [
      {key: 'name', type: 'string', required: true},
      {key: 'legalType', type: 'string', required: false},
      {key: 'address', type: 'string'}
    ] as VendorField[],
    searchResponseFields: [
      {key: 'blacklisted', type: 'boolean'},
      {key: 'legalType', type: 'string'},
      {key: 'yearCreated', type: 'number'},
      {key: 'address', type: 'string'},
      {key: 'suspicious', type: 'boolean'}
    ] as VendorField[],
    adminFields: [
      {key: 'apiKey', name: 'API key', required: true},
      {key: 'test1', name: 'test lol', required: true, enum: ['a', 'b', 'c']}
    ]
  }),
  new Vendor({
    key: 'dnb',
    name: 'Dun & Bradstreet - People',
    strategy: 'searchAndDetails',
    description:
      'Search for people in the DnB "people" API, see <a target="_blank" href="https://google.com">details</a>',
    searchQueryFields: [
      {key: 'firstName', type: 'string', required: true},
      {key: 'lastName', type: 'string', required: true},
      {key: 'address', type: 'string'},
      {key: 'age', type: 'number'},
      {key: 'suspicious', type: 'boolean'}
    ] as VendorField[],
    searchResponseFields: [
      {key: 'firstName', type: 'string'},
      {key: 'lastName', type: 'string'},
      {key: 'address', type: 'string'},
      {key: 'age', type: 'number'},
      {key: 'suspicious', type: 'boolean'}
    ] as VendorField[],
    detailsResponseFields: [
      {key: 'citizenship', type: 'string'},
      {key: 'fullName', type: 'string'},
      {key: 'address', type: 'string'},
      {key: 'listed', type: 'boolean'},
      {key: 'income', type: 'number'}
    ] as VendorField[],
    adminFields: [
      {key: 'apiKey', name: 'API key', required: true},
      {key: 'test1', name: 'test value', required: false},
      {key: 'test2', name: 'test choice', required: true, enum: ['yes', 'no']},
      {key: 'test3', name: 'test preference', required: false, enum: ['a', 'b', 'c']}
    ]
  }),
  new Vendor({
    key: 'annuaire-entreprises-data-gouv-fr',
    name: 'Annuaire-Entreprises (data.gouv.fr)',
    strategy: 'search',
    description: `Search for companies in the French Government's "Annuaire Entreprises" database, see <a target="_blank" href="https://annuaire-entreprises.data.gouv.fr/">details</a>`,
    searchQueryFields: [
      {key: 'q', type: 'string', required: true},
      {key: 'code_postal', type: 'string'},
      {key: 'departement', type: 'string'},
      {key: 'est_association', type: 'boolean'},
      {key: 'est_ess', type: 'boolean'},
      {key: 'est_entrepreneur_individuel', type: 'boolean'},
      {key: 'etat_administratif', type: 'string'}, // A (Actif), C (Cessé)
      {key: 'nom_personne', type: 'string'},
      {key: 'prenom_personne', type: 'string'},
      {key: 'ca_min', type: 'number'},
      {key: 'resultat_net_min', type: 'number'}
    ] as VendorField[],
    searchResponseFields: [
      {key: 'siren', type: 'string'},
      {key: 'nom_complet', type: 'string'},
      {key: 'nom_raison_sociale', type: 'string'},
      {key: 'nombre_etablissements', type: 'number'},
      {key: 'nombre_etablissements_ouverts', type: 'number'},
      {key: 'siege.activite_principale', type: 'string'},
      {key: 'siege.adresse', type: 'string'},
      {key: 'siege.caractere_employeur', type: 'string'},
      {key: 'siege.code_postal', type: 'string'},
      {key: 'siege.commune', type: 'string'},
      {key: 'siege.coordonnees', type: 'string'},
      {key: 'siege.date_creation', type: 'string'},
      {key: 'siege.date_debut_activite', type: 'string'},
      {key: 'siege.date_mise_a_jour', type: 'string'},
      {key: 'siege.departement', type: 'string'},
      {key: 'siege.est_siege', type: 'boolean'},
      {key: 'siege.etat_administratif', type: 'string'},
      {key: 'siege.geo_adresse', type: 'string'},
      {key: 'siege.geo_id', type: 'string'},
      {key: 'siege.latitude', type: 'string'},
      {key: 'siege.libelle_commune', type: 'string'},
      {key: 'siege.libelle_voie', type: 'string'},
      {key: 'siege.longitude', type: 'string'},
      {key: 'siege.numero_voie', type: 'string'},
      {key: 'siege.region', type: 'string'},
      {key: 'siege.siret', type: 'string'},
      {key: 'siege.type_voie', type: 'string'},
      {key: 'activite_principale', type: 'string'},
      {key: 'categorie_entreprise', type: 'string'},
      {key: 'caractere_employeur', type: 'string'},
      {key: 'annee_categorie_entreprise', type: 'string'},
      {key: 'date_creation', type: 'string'},
      {key: 'date_mise_a_jour', type: 'string'},
      {key: 'etat_administratif', type: 'string'},
      {key: 'nature_juridique', type: 'string'},
      {key: 'section_activite_principale', type: 'string'},
      {key: 'statut_diffusion', type: 'string'},
      {key: 'matching_etablissements', type: 'string'},
      {key: 'complements.convention_collective_renseignee', type: 'boolean'},
      {key: 'complements.egapro_renseignee', type: 'boolean'},
      {key: 'complements.est_association', type: 'boolean'},
      {key: 'complements.est_bio', type: 'boolean'},
      {key: 'complements.est_entrepreneur_individuel', type: 'boolean'},
      {key: 'complements.est_entrepreneur_spectacle', type: 'boolean'},
      {key: 'complements.est_ess', type: 'boolean'},
      {key: 'complements.est_finess', type: 'boolean'},
      {key: 'complements.est_organisme_formation', type: 'boolean'},
      {key: 'complements.est_qualiopi', type: 'boolean'},
      {key: 'complements.est_rge', type: 'boolean'},
      {key: 'complements.est_service_public', type: 'boolean'},
      {key: 'complements.est_societe_mission', type: 'boolean'},
      {key: 'complements.est_uai', type: 'boolean'}
      /*
      "siren": "521313106",
      "nom_complet": "TEST",
      "nom_raison_sociale": "TEST",
      "nombre_etablissements": 1,
      "nombre_etablissements_ouverts": 1,
      "siege.activite_principale": "96.09Z",
      "siege.adresse": "6 RUE DESIRE NIEL 06000 NICE",
      "siege.caractere_employeur": "N",
      "siege.code_postal": "06000",
      "siege.commune": "06088",
      "siege.coordonnees": "43.700003,7.276042",
      "siege.date_creation": "2010-04-01",
      "siege.date_debut_activite": "2010-04-01",
      "siege.date_mise_a_jour": "2010-03-26T08:56:23",
      "siege.departement": "06",
      "siege.est_siege": true,
      "siege.etat_administratif": "A",
      "siege.geo_adresse": "6 Rue Désiré Niel 06000 Nice",
      "siege.geo_id": "06088_1930_00006",
      "siege.latitude": "43.700003",
      "siege.libelle_commune": "NICE",
      "siege.libelle_voie": "DESIRE NIEL",
      "siege.longitude": "7.276042",
      "siege.numero_voie": "6",
      "siege.region": "93",
      "siege.siret": "52131310600010",
      "siege.type_voie": "RUE",
      "activite_principale": "96.09Z",
      "categorie_entreprise": "PME",
      "caractere_employeur": "N",
      "annee_categorie_entreprise": "2021",
      "date_creation": "2010-04-01",
      "date_mise_a_jour": "2017-05-20T01:21:43",
      "etat_administratif": "A",
      "nature_juridique": "5499",
      "section_activite_principale": "S",
      "statut_diffusion": "O",
      "matching_etablissements": "\"activite_principale\": \"96.09Z\",\n\"annee_tranche_effectif_salarie\": null,\n\"adresse\": \"6 RUE DESIRE NIEL 06000 NICE\",\n\"caractere_employeur\": \"N\",\n\"code_postal\": \"06000\",\n\"commune\": \"06088\",\n\"date_creation\": \"2010-04-01\",\n\"date_debut_activite\": \"2010-04-01\",\n\"est_siege\": true,\n\"etat_administratif\": \"A\",\n\"geo_id\": \"06088_1930_00006\",\n\"latitude\": \"43.700003\",\n\"libelle_commune\": \"NICE\",\n\"liste_enseignes\": null,\n\"liste_finess\": null,\n\"liste_id_bio\": null,\n\"liste_idcc\": null,\n\"liste_id_organisme_formation\": null,\n\"liste_rge\": null,\n\"liste_uai\": null,\n\"longitude\": \"7.276042\",\n\"nom_commercial\": null,\n\"region\": \"93\",\n\"siret\": \"52131310600010\",\n\"tranche_effectif_salarie\": null\n",
      "complements.convention_collective_renseignee": false,
      "complements.egapro_renseignee": false,
      "complements.est_association": false,
      "complements.est_bio": false,
      "complements.est_entrepreneur_individuel": false,
      "complements.est_entrepreneur_spectacle": false,
      "complements.est_ess": false,
      "complements.est_finess": false,
      "complements.est_organisme_formation": false,
      "complements.est_qualiopi": false,
      "complements.est_rge": false,
      "complements.est_service_public": false,
      "complements.est_societe_mission": false,
      "complements.est_uai": false
       */
    ] as VendorField[],
    adminFields: []
  })
];
