import {LkError, Response, User} from '@linkurious/rest-client';
import {LkEdge, LkNode} from '@linkurious/rest-client/dist/src/api/graphItemTypes';

import {VendorSearchResult} from '../../shared/api/response';
import {IntegrationModel, IntegrationModelPublic} from '../../shared/integration/IntegrationModel';
import {VendorIntegration} from '../../shared/integration/vendorIntegration';
import {asError, clone, randomString} from '../../shared/utils';

import {API} from './api/api';
import {UiFacade} from './ui/uiFacade';
import {Schema} from './api/schema';
import {SearchSuccessState, UrlParams} from './urlParams';
import {Configuration} from './configuration';

export class ServiceFacade {
  private readonly urlParams;
  public readonly ui: UiFacade;
  public readonly api: API;
  public readonly schema: Schema;
  public readonly config: Configuration;

  public constructor() {
    this.api = new API();
    this.ui = new UiFacade(this);
    this.urlParams = new UrlParams();
    this.schema = new Schema(this.api.server);
    this.config = new Configuration(this.api);
  }

  async getCurrentUser(): Promise<Response<User> | Response<LkError>> {
    return this.api.server.auth.getCurrentUser();
  }

  async init(query: URLSearchParams): Promise<void> {
    return this.ui.longTask.run(
      null,
      async (updater) => {
        updater.update('App initialization...');
        try {
          const rCurrentUser = await this.getCurrentUser();
          if (rCurrentUser.isSuccess()) {
            // initialize ui (bind buttons etc)
            this.ui.init(rCurrentUser.body);

            // start main app
            await this.main(query);
          } else {
            // Not awaiting: let the spinner stop after the popin is displayed
            void this.ui.popIn.show(
              'error',
              "You don't have access to this plugin. Please contact your administrator.",
              true
            );
          }
        } catch (e) {
          // Not awaiting: let the spinner stop after the popin is displayed
          console.error(e);
          void this.ui.popIn.show('error', asError(e).message, true);
        }
      },
      {hideApp: true}
    );
  }

  async main(query: URLSearchParams): Promise<void> {
    const state = this.urlParams.parse(query);
    if (state.error) {
      await this.ui.popIn.show('error', state.errorMessage, true);
    } else if (state.action === 'search') {
      await this.search(state);
    } else {
      // No action to perform
    }
  }

  async search(state: SearchSuccessState): Promise<void> {
    const response = await this.api.searchNode({
      integrationId: state.integrationId,
      sourceKey: state.sourceKey,
      nodeId: state.itemId
    });
    if (response.error) {
      await this.ui.popIn.show('error', `${response.error.message} (error ${response.error.code})`);
      return;
    }
    await this.ui.showSearchResponse(response);
  }

  async addIntegration(): Promise<void> {
    const newId = randomString('azertyupqsdfghjmwxcvbn23456789', 5);
    const newIntegration = await this.ui.editIntegration({id: newId});
    if (!newIntegration) {
      return;
    }
    await this.config.saveNewIntegration(newIntegration);
  }

  async editIntegration(integrationId: string): Promise<void> {
    const model = await this.config.getIntegration(integrationId);
    const newModel = await this.ui.editIntegration(clone(model));
    if (!newModel) {
      return;
    }
    await this.config.saveExistingIntegration(newModel);
  }

  async importSearchResult(
    integration: IntegrationModelPublic,
    searchResult: VendorSearchResult,
    inputNodeId: string
  ): Promise<void> {
    console.log('IMPORT_RESULT: ' + JSON.stringify(searchResult));
    const int = new VendorIntegration(integration);

    // create + save the target node from the search result
    const newNodeR = await this.api.server.graphNode.createNode(int.getOutputNode(searchResult));
    if (!newNodeR.isSuccess()) {
      throw new Error(`Failed to create output node: ${newNodeR.body.message}`);
    }

    // create the connecting edge
    const newEdgeR = await this.api.server.graphEdge.createEdge(
      int.getOutputEdge(searchResult, newNodeR.body.id, inputNodeId)
    );
    if (!newEdgeR.isSuccess()) {
      throw new Error(`Failed to create output edge: ${newEdgeR.body.message}`);
    }

    let addedInLKE = false;
    if (window.opener) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const ogma = window.opener.ogma as {
          addNode: (node: LkNode) => void;
          addEdge: (edge: LkEdge) => void;
        };
        ogma.addNode(newNodeR.body);
        ogma.addEdge(newEdgeR.body);
        addedInLKE = true;
      } catch (e) {
        console.warn('Could not add node/edge in LKE', e);
      }
    }

    if (addedInLKE) {
      await this.ui.popIn.show(
        'info',
        `Successfully imported search result in the graph. The visualization has been updated`
      );
    } else {
      await this.ui.popIn.show('info', `Successfully imported search result in the graph.`);
    }
  }

  async createCustomAction(
    integration: IntegrationModel,
    backTo: 'integration-list'
  ): Promise<void> {
    console.log('CREATE_CUSTOM_ACTION: ' + JSON.stringify(integration));
    await this.ui.showCustomActionManager(integration);
    if (backTo === 'integration-list') {
      await this.ui.showIntegrationsList();
    }
  }
}
