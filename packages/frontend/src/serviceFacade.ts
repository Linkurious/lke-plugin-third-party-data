import {LkEdge, LkNode, LkError, Response, User} from '@linkurious/rest-client';

import {VendorSearchResult} from '../../shared/api/response';
import {IntegrationModel, IntegrationModelPublic} from '../../shared/integration/IntegrationModel';
import {VendorIntegrationPublic} from '../../shared/integration/vendorIntegrationPublic';
import {asError, clone, randomString} from '../../shared/utils';
import {STRINGS} from '../../shared/strings';

import {API} from './api/api';
import {UiFacade} from './ui/uiFacade';
import {Schema} from './api/schema';
import {SearchSuccessState, UrlParams} from './urlParams';
import {Configuration} from './configuration';
import {$elem} from './ui/uiUtils.ts';

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
      async (updater) => {
        updater.update('Initialization...');
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
              `You don't have access to this plugin. Please contact your administrator.`,
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
      await this.ui.showEmptyState();
    }
  }

  async search(state: SearchSuccessState): Promise<void> {
    const response = await this.api.searchNode({
      integrationId: state.integrationId,
      sourceKey: state.sourceKey,
      nodeId: state.nodeId
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
    await this.ui.longTask.run(async (p) => {
      p.update(STRINGS.ui.editIntegration.savingNewIntegration);
      await this.config.saveNewIntegration(newIntegration);
      p.update(STRINGS.ui.editIntegration.restartingPlugin);
      await this.api.server.plugin.restartAll();
      p.update(STRINGS.ui.global.done);
    });
  }

  async editIntegration(integrationId: string): Promise<void> {
    const model = await this.config.getIntegration(integrationId);
    const newModel = await this.ui.editIntegration(clone(model));
    if (!newModel) {
      return;
    }

    await this.ui.longTask.run(async (p) => {
      p.update(STRINGS.ui.editIntegration.savingIntegration);
      await this.config.saveExistingIntegration(newModel);
      p.update(STRINGS.ui.editIntegration.restartingPlugin);
      await this.api.server.plugin.restartAll();
      p.update(STRINGS.ui.global.done);
    });
  }

  async importSearchResult(
    integration: IntegrationModelPublic,
    searchResult: VendorSearchResult,
    inputNodeId: string
  ): Promise<void> {
    console.log('IMPORT_RESULT: ' + JSON.stringify(searchResult));
    let addedInLKE = false;
    await this.ui.longTask.run(async (p) => {
      const int = new VendorIntegrationPublic(integration);

      // create + save the target node from the search result
      p.update(STRINGS.ui.importSearchResult.creatingNode);
      const newNodeR = await this.api.server.graphNode.createNode(int.getOutputNode(searchResult));
      if (!newNodeR.isSuccess()) {
        throw new Error(STRINGS.errors.importSearchResult.failedToCreateNode(newNodeR.body));
      }
      const newNodeId = newNodeR.body.id;

      // create the connecting edge
      p.update(STRINGS.ui.importSearchResult.creatingEdge);
      const newEdgeR = await this.api.server.graphEdge.createEdge(
        int.getOutputEdge(searchResult, newNodeR.body.id, inputNodeId)
      );
      if (!newEdgeR.isSuccess()) {
        throw new Error(STRINGS.errors.importSearchResult.failedToCreateEdge(newEdgeR.body));
      }

      p.update(STRINGS.ui.global.done);
      if (window.opener) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const ogma = window.opener.ogma as OgmaInterface;
          const ogmaNode = ogma.addNode(newNodeR.body);
          ogma.addEdge(newEdgeR.body);
          addedInLKE = true;
          ogma.clearSelection();
          ogmaNode.setSelected(true);
          ogmaNode.locate();
          void ogma.layouts.force({nodes: [newNodeId, inputNodeId]});
        } catch (e) {
          console.warn('Could not add node/edge in LKE', e);
        }
      }
    });

    const confirmText = addedInLKE
      ? STRINGS.ui.importSearchResult.successfullyCreatedAndAdded
      : STRINGS.ui.importSearchResult.successfullyCreated;
    await this.ui.popIn.showElement(
      'Success',
      $elem('div', {class: 'my-1'}, [
        $elem('p', {class: 'my-2'}, confirmText),
        $elem('div', {class: 'd-flex justify-content-center'}, [
          this.ui.button.create(
            STRINGS.ui.importSearchResult.confirmModalCloseButton,
            {primary: true},
            () => {
              this.ui.popIn.close();
              window.close();
            }
          )
        ])
      ])
    );
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

  async deleteIntegration(integrationId: string): Promise<void> {
    await this.ui.longTask.run(async (p) => {
      p.update(STRINGS.ui.editIntegration.deletingIntegration);
      await this.config.deleteIntegration(integrationId);
      p.update(STRINGS.ui.editIntegration.restartingPlugin);
      await this.api.server.plugin.restartAll();
      p.update(STRINGS.ui.global.done);
    });
  }
}

interface OgmaInterface {
  clearSelection: () => void;
  addNode: (node: LkNode) => OgmaNode;
  addEdge: (edge: LkEdge) => void;
  layouts: {
    force: (params: {nodes: string[]}) => Promise<void>;
  };
}

interface OgmaNode {
  setSelected(s: boolean): void;
  locate(): void;
}
