import {LkEdge, LkNode, LkError, Response, User} from '@linkurious/rest-client';

import {VendorResult} from '../../shared/api/response';
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
    await this.ui.showConfirmIntegrationCreated(newIntegration);
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
    searchResult: VendorResult,
    inputNodeId: string
  ): Promise<void> {
    console.log('IMPORT_RESULT: ' + JSON.stringify(searchResult));
    let addedInLKE = false;
    await this.ui.longTask.run(async (p) => {
      const int = new VendorIntegrationPublic(integration);
      let resultToImport = searchResult;

      // if needed, resolve the details for the selected search result
      if (int.vendor.strategy === 'searchAndDetails') {
        p.update(STRINGS.ui.importSearchResult.gettingDetails);
        const detailsR = await this.api.getDetails(integration, searchResult.id);
        if (detailsR.result) {
          resultToImport = detailsR.result;
        } else {
          throw new Error(STRINGS.errors.importResult.detailsNotFound);
        }
      }

      // create + save the target node from the search result
      const totalNodes = (resultToImport.neighbors?.length ?? 0) + 1;
      const itemsToAdd: {nodes: LkNode[]; edges: LkEdge[]} = {nodes: [], edges: []};

      p.update(STRINGS.ui.importSearchResult.creatingNode + ` (1/${totalNodes})`);
      const newNodeR = await this.api.server.graphNode.createNode(
        int.getOutputNode(resultToImport)
      );
      if (!newNodeR.isSuccess()) {
        throw new Error(STRINGS.errors.importResult.failedToCreateNode(newNodeR.body));
      }
      const newNodeId = newNodeR.body.id;
      itemsToAdd.nodes.push(newNodeR.body);

      // create the connecting edge
      p.update(STRINGS.ui.importSearchResult.creatingEdge + ` (1/${totalNodes})`);
      const newEdgeR = await this.api.server.graphEdge.createEdge(
        int.getOutputEdge(resultToImport, newNodeR.body.id, inputNodeId)
      );
      if (!newEdgeR.isSuccess()) {
        throw new Error(STRINGS.errors.importResult.failedToCreateEdge(newEdgeR.body));
      }
      itemsToAdd.edges.push(newEdgeR.body);

      let failedNodes = 0;
      let failedEdges = 0;
      const neighbors = resultToImport.neighbors ?? [];

      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i];
        // create the neighbor node
        p.update(STRINGS.ui.importSearchResult.creatingNode + ` (${i + 2}/${totalNodes})`);
        const nodeData = int.getNeighborNode(neighbor);
        const newNeighborNodeR = await this.api.server.graphNode.createNode(nodeData);
        if (!newNeighborNodeR.isSuccess()) {
          failedNodes++;
          continue;
        }
        itemsToAdd.nodes.push(newNeighborNodeR.body);
        // create the neighbor edge
        p.update(STRINGS.ui.importSearchResult.creatingNode + ` (${i + 2}/${totalNodes})`);
        const edgeData = int.getNeighborEdge(neighbor, newNodeId, newNeighborNodeR.body.id);
        const newNeighborEdgeR = await this.api.server.graphEdge.createEdge(edgeData);
        if (!newNeighborEdgeR.isSuccess()) {
          failedEdges++;
          continue;
        }
        itemsToAdd.edges.push(newNeighborEdgeR.body);
      }

      if (failedEdges + failedNodes > 0) {
        console.log(`Failed to created ${failedNodes} nodes and ${failedEdges} edges`);
      }

      p.update(STRINGS.ui.global.done);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const ogma = this.getOgma();
      if (ogma) {
        try {
          const addedGraph = await ogma.addGraph(itemsToAdd, {ignoreInvalid: true});
          addedInLKE = true;
          ogma.clearSelection();
          addedGraph.nodes.setSelected(true);
          await addedGraph.nodes.locate();
          void ogma.layouts.force({nodes: [inputNodeId, ...addedGraph.nodes.getId()]});
        } catch (e) {
          console.warn('Could not add node/edge in LKE', e);
        }
      } else {
        console.log('Ogma not available, cannot add graph to viz');
      }
    });

    const confirmText = addedInLKE
      ? STRINGS.ui.importSearchResult.successfullyCreatedAndAdded
      : STRINGS.ui.importSearchResult.successfullyCreated;
    await this.ui.popIn.showElement(
      STRINGS.ui.importSearchResult.title,
      $elem('p', {class: 'my-2'}, confirmText),
      [
        this.ui.button.create(STRINGS.ui.importSearchResult.confirmModalCloseButton, {}, () => {
          this.ui.popIn.close();
          this.closePlugin();
        })
      ]
    );
  }

  private getOgma(): OgmaInterface | undefined {
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (window.parent?.ogma ?? window.opener?.ogma ?? undefined) as OgmaInterface | undefined;
  }

  private closePlugin(): void {
    const inIframe = window.parent !== window;
    if (inIframe) {
      const button = window.parent.document.querySelector('s-popin .close button');
      if (button && 'click' in button && typeof button.click === 'function') {
        button.click();
      }
    } else {
      window.close();
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
  addGraph: (
    graph: {nodes: LkNode[]; edges: LkEdge[]},
    options: {ignoreInvalid: boolean}
  ) => Promise<{nodes: OgmaNodeList; edges: OgmaEdgeList}>;
  layouts: {
    force: (params: {nodes: string[]}) => Promise<void>;
  };
}

interface OgmaNodeList {
  setSelected(s: boolean): void;
  locate(): Promise<void>;
  getId(): string[];
}

interface OgmaEdgeList {}
