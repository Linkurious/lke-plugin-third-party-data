import * as http from 'node:http';

import express from 'express';
import * as superagent from 'superagent';
import {RestClient} from '@linkurious/rest-client';

import plugin from '../routes';

const app = express();
app.use(express.json());
const apiRouter = express.Router();
apiRouter.get('/test', (_req, res) => {
  res.end('hello');
});

plugin({
  router: apiRouter,
  getRestClient: (req) => {
    const agent = superagent.agent();
    if (req.headers.cookie !== undefined) {
      agent.jar.setCookie(req.headers.cookie);
      void agent.set('x-lke-secret', /*config.secret*/ '123');
    }
    return new RestClient({
      baseUrl: '/',
      agent: agent
    });
  },
  configuration: {
    basePath: '3d',
    integrations: [
      {
        id: 'rpmvv',
        vendorKey: 'annuaire-entreprises-data-gouv-fr',
        adminSettings: {},
        sourceKey: 'abc123',
        inputNodeCategory: 'Person',
        searchQueryFieldMapping: [
          {outputPropertyKey: 'q', type: 'property', inputPropertyKey: 'name'}
        ],
        searchResponseFieldSelection: ['siren', 'nom_complet', 'nom_raison_sociale'],
        outputEdgeType: 'has_details',
        outputNodeCategory: 'co_det',
        outputNodeFieldMapping: [
          {type: 'property', inputPropertyKey: 'siren', outputPropertyKey: 'siren'},
          {type: 'property', inputPropertyKey: 'nom_complet', outputPropertyKey: 'nom_complet'},
          {
            type: 'property',
            inputPropertyKey: 'nom_raison_sociale',
            outputPropertyKey: 'nom_raison_sociale'
          },
          {
            type: 'property',
            inputPropertyKey: 'nombre_etablissements',
            outputPropertyKey: 'nombre_etablissements'
          },
          {
            type: 'property',
            inputPropertyKey: 'nombre_etablissements_ouverts',
            outputPropertyKey: 'nombre_etablissements_ouverts'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_activite_principale',
            outputPropertyKey: 'siege_activite_principale'
          },
          {type: 'property', inputPropertyKey: 'siege_adresse', outputPropertyKey: 'siege_adresse'},
          {
            type: 'property',
            inputPropertyKey: 'siege_caractere_employeur',
            outputPropertyKey: 'siege_caractere_employeur'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_code_postal',
            outputPropertyKey: 'siege_code_postal'
          },
          {type: 'property', inputPropertyKey: 'siege_commune', outputPropertyKey: 'siege_commune'},
          {
            type: 'property',
            inputPropertyKey: 'siege_coordonnees',
            outputPropertyKey: 'siege_coordonnees'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_date_creation',
            outputPropertyKey: 'siege_date_creation'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_date_debut_activite',
            outputPropertyKey: 'siege_date_debut_activite'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_date_mise_a_jour',
            outputPropertyKey: 'siege_date_mise_a_jour'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_departement',
            outputPropertyKey: 'siege_departement'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_est_siege',
            outputPropertyKey: 'siege_est_siege'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_etat_administratif',
            outputPropertyKey: 'siege_etat_administratif'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_geo_adresse',
            outputPropertyKey: 'siege_geo_adresse'
          },
          {type: 'property', inputPropertyKey: 'siege_geo_id', outputPropertyKey: 'siege_geo_id'},
          {
            type: 'property',
            inputPropertyKey: 'siege_latitude',
            outputPropertyKey: 'siege_latitude'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_libelle_commune',
            outputPropertyKey: 'siege_libelle_commune'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_libelle_voie',
            outputPropertyKey: 'siege_libelle_voie'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_longitude',
            outputPropertyKey: 'siege_longitude'
          },
          {
            type: 'property',
            inputPropertyKey: 'siege_numero_voie',
            outputPropertyKey: 'siege_numero_voie'
          },
          {type: 'property', inputPropertyKey: 'siege_region', outputPropertyKey: 'siege_region'},
          {type: 'property', inputPropertyKey: 'siege_siret', outputPropertyKey: 'siege_siret'},
          {
            type: 'property',
            inputPropertyKey: 'siege_type_voie',
            outputPropertyKey: 'siege_type_voie'
          },
          {
            type: 'property',
            inputPropertyKey: 'activite_principale',
            outputPropertyKey: 'activite_principale'
          },
          {
            type: 'property',
            inputPropertyKey: 'categorie_entreprise',
            outputPropertyKey: 'categorie_entreprise'
          },
          {
            type: 'property',
            inputPropertyKey: 'caractere_employeur',
            outputPropertyKey: 'caractere_employeur'
          },
          {
            type: 'property',
            inputPropertyKey: 'annee_categorie_entreprise',
            outputPropertyKey: 'annee_categorie_entreprise'
          },
          {type: 'property', inputPropertyKey: 'date_creation', outputPropertyKey: 'date_creation'},
          {
            type: 'property',
            inputPropertyKey: 'date_mise_a_jour',
            outputPropertyKey: 'date_mise_a_jour'
          },
          {
            type: 'property',
            inputPropertyKey: 'etat_administratif',
            outputPropertyKey: 'etat_administratif'
          },
          {
            type: 'property',
            inputPropertyKey: 'nature_juridique',
            outputPropertyKey: 'nature_juridique'
          },
          {
            type: 'property',
            inputPropertyKey: 'section_activite_principale',
            outputPropertyKey: 'section_activite_principale'
          },
          {
            type: 'property',
            inputPropertyKey: 'statut_diffusion',
            outputPropertyKey: 'statut_diffusion'
          },
          {
            type: 'property',
            inputPropertyKey: 'matching_etablissements',
            outputPropertyKey: 'matching_etablissements'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_convention_collective_renseignee',
            outputPropertyKey: 'complements_convention_collective_renseignee'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_egapro_renseignee',
            outputPropertyKey: 'complements_egapro_renseignee'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_association',
            outputPropertyKey: 'complements_est_association'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_bio',
            outputPropertyKey: 'complements_est_bio'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_entrepreneur_individuel',
            outputPropertyKey: 'complements_est_entrepreneur_individuel'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_entrepreneur_spectacle',
            outputPropertyKey: 'complements_est_entrepreneur_spectacle'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_ess',
            outputPropertyKey: 'complements_est_ess'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_finess',
            outputPropertyKey: 'complements_est_finess'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_organisme_formation',
            outputPropertyKey: 'complements_est_organisme_formation'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_qualiopi',
            outputPropertyKey: 'complements_est_qualiopi'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_rge',
            outputPropertyKey: 'complements_est_rge'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_service_public',
            outputPropertyKey: 'complements_est_service_public'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_societe_mission',
            outputPropertyKey: 'complements_est_societe_mission'
          },
          {
            type: 'property',
            inputPropertyKey: 'complements_est_uai',
            outputPropertyKey: 'complements_est_uai'
          }
        ]
      }
    ]
  }
});

app.use('/plugins/3d/api', apiRouter);
http.createServer(app).listen(3000, () => {
  console.log('listening on port 3000');
});
