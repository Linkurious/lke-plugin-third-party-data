import {
  BulkCreateEdgesParams,
  BulkCreateNodesParams,
  LkEdge,
  LkError,
  LkNode,
  Response,
  User
} from '@linkurious/rest-client';

import {NeighborResult, VendorResult} from '../../shared/api/response';
import {IntegrationModelPublic} from '../../shared/integration/IntegrationModel';
import {VendorIntegrationPublic} from '../../shared/integration/vendorIntegrationPublic';
import {asError, clone, randomString} from '../../shared/utils';
import {STRINGS} from '../../shared/strings';

import {API} from './api/api';
import {UiFacade} from './ui/uiFacade';
import {Schema} from './api/schema';
import {SearchSuccessState, UrlParams} from './urlParams';
import {Configuration} from './configuration';
import {$elem} from './ui/uiUtils.ts';
import {IWaitingMessage} from './ui/longTask.ts';

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
      p.update(STRINGS.ui.global.done);
    });
    await this.ui.showConfirmIntegrationCreated();
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
      p.update(STRINGS.ui.global.done);
    });
  }

  public async importSearchResults(
    integration: IntegrationModelPublic,
    searchResults: VendorResult[],
    inputNodeId: string
  ): Promise<void> {
    const int = new VendorIntegrationPublic(integration);
    const itemsToAdd: {nodes: LkNode[]; edges: LkEdge[]} = {nodes: [], edges: []};
    const apiErrors: string[] = [];
    let addedInLKE = false;

    // Fail early if there are no search results to import - shouldn't happen
    if (searchResults.length === 0) {
      await this.ui.popIn.showElement(
        'Warning',
        $elem('p', {class: 'my-2'}, STRINGS.ui.importSearchResult.noResultsToImport),
        [
          this.ui.button.create(STRINGS.ui.importSearchResult.confirmModalCloseButton, {}, () => {
            this.ui.popIn.close();
            this.closePlugin();
          })
        ]
      );
      return;
    }

    await this.ui.longTask.run(async (p) => {
      const resolvedResults: VendorResult[] = [];
      // Resolve details for each search result if needed
      for (let i = 0; i < searchResults.length; i++) {
        p.update(
          `${STRINGS.ui.importSearchResult.gettingDetails} (${i + 1}/${searchResults.length})`
        );
        const searchResult = searchResults[i];
        if (int.vendor.strategy === 'searchAndDetails') {
          const detailsR = await this.api.getDetails(integration, searchResult.id);
          if (!detailsR.result) {
            throw new Error(STRINGS.errors.importResult.detailsNotFound);
          }
          resolvedResults.push(detailsR.result);
        } else {
          resolvedResults.push(searchResult);
        }
      }

      // Create the output nodes and their neighbors
      const bulkNodeImports = new Map<string, BulkCreateNodesParams>();
      const resultNodeIdMap = new Map<VendorResult | NeighborResult, string>(); // result > nodeId
      const keyResultMap = new Map<string, VendorResult | NeighborResult>(); // key > result

      resolvedResults
        // Unify result for output nodes and neighbor nodes
        .flatMap((result) => [
          {result: result, node: int.getOutputNode(result)},
          ...(result.neighbors ?? []).map((neighbor) => {
            return {result: neighbor, node: int.getNeighborNode(neighbor)};
          })
        ])
        // Create bulk import params for each category
        .forEach(({result, node}) => {
          const category = node.categories[0];
          const nodeKey = ServiceFacade.getNodeKey(
            category,
            (node.properties?.[result.keyProperty ?? ''] ?? '') as string
          );

          if (!bulkNodeImports.has(category)) {
            bulkNodeImports.set(category, {
              sourceKey: integration.sourceKey,
              nodes: [],
              duplicateConfig: int.getDuplicateConfig(result.keyProperty)
            });
          }

          bulkNodeImports.get(category)!.nodes.push(node);
          keyResultMap.set(nodeKey, result);
        });

      // Process the bulk node imports
      let total = Array.from(bulkNodeImports.values()).reduce(
        (sum, params) => sum + params.nodes.length,
        0
      );
      let processed = 0;
      p.update(STRINGS.ui.importSearchResult.creatingNode + ` (${processed}/${total})`);

      for (const [category, params] of bulkNodeImports) {
        processed += params.nodes.length;
        const bulkR = await this.api.server.graphNode.bulkCreateNodes(params);
        p.update(STRINGS.ui.importSearchResult.creatingNode + ` (${processed}/${total})`);

        if (!bulkR.isSuccess()) {
          apiErrors.push(`Failed to bulk create nodes (${category})`);
          continue;
        }

        itemsToAdd.nodes.push(...bulkR.body.items);
        const max = Math.min(params.nodes.length, bulkR.body.items.length);
        for (let i = 0; i < max; i++) {
          const nodeKey = bulkR.body.items[i].data.properties?.[
            params.duplicateConfig?.duplicateDetection?.property ?? ''
          ] as string;
          const result = keyResultMap.get(nodeKey);
          const nodeId = bulkR.body.items[i].id;

          if (!result) {
            continue;
          }

          // Map the result to the created node ID for later edge creation
          resultNodeIdMap.set(result, nodeId);
        }
      }

      // Create edges from output nodes to input node and to neighbor nodes
      const bulkEdgeImports = new Map<string, BulkCreateEdgesParams>();
      resolvedResults
        // Unify result for all edges
        .flatMap((result) => {
          const outputNodeId = resultNodeIdMap.get(result);
          if (!outputNodeId) {
            return;
          }
          return [
            {result: result, edge: int.getOutputEdge(result, outputNodeId, inputNodeId)},
            ...(result.neighbors ?? []).map((neighbor) => {
              const neighborNodeId = resultNodeIdMap.get(neighbor);
              if (!neighborNodeId) {
                return;
              }
              return {
                result: neighbor,
                edge: int.getNeighborEdge(neighbor, outputNodeId, neighborNodeId)
              };
            })
          ];
        })
        // Create bulk import params for each type
        .forEach((item) => {
          if (!item) {
            return;
          }
          const {result, edge} = item;

          if (!bulkEdgeImports.has(edge.type)) {
            bulkEdgeImports.set(edge.type, {
              sourceKey: integration.sourceKey,
              edges: [],
              duplicateConfig: int.getDuplicateConfig(result.edgeKeyProperty)
            });
          }

          bulkEdgeImports.get(edge.type)!.edges.push(edge);
        });

      // Process the bulk edge imports
      total = Array.from(bulkEdgeImports.values()).reduce(
        (sum, params) => sum + params.edges.length,
        0
      );
      processed = 0;
      p.update(STRINGS.ui.importSearchResult.creatingEdge + ` (${processed}/${total})`);

      for (const [type, params] of bulkEdgeImports) {
        processed += params.edges.length;
        const bulkR = await this.api.server.graphEdge.bulkCreateEdges(params);
        p.update(STRINGS.ui.importSearchResult.creatingEdge + ` (${processed}/${total})`);

        if (!bulkR.isSuccess()) {
          apiErrors.push(`Failed to bulk create edges (${type})`);
          continue;
        }

        itemsToAdd.edges.push(...bulkR.body.items);
      }

      p.update(STRINGS.ui.global.done);

      // Add items to the viz
      addedInLKE = await this.addItemsToOgma(itemsToAdd);
    });

    // List errors as a warning popin if any encountered
    if (apiErrors.length > 0) {
      await this.ui.popIn.showElement(
        'Warning',
        $elem(
          'div',
          {class: 'my-2'},
          apiErrors.map((message) => $elem('p', {}, message))
        ),
        [
          this.ui.button.create(STRINGS.ui.importSearchResult.confirmModalCloseButton, {}, () => {
            this.ui.popIn.close();
            this.closePlugin();
          })
        ]
      );
      return;
    }

    await this.showImportConfirmation(addedInLKE);
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

      await this.importNeighbors(int, resultToImport, newNodeId, p, itemsToAdd);

      p.update(STRINGS.ui.global.done);
      addedInLKE = await this.addItemsToOgma(itemsToAdd);
    });

    await this.showImportConfirmation(addedInLKE);
  }

  private static getNodeKey(category: string, key: string): string {
    return `node|${category}|${key}`;
  }

  private async addItemsToOgma(itemsToAdd: {nodes: LkNode[]; edges: LkEdge[]}): Promise<boolean> {
    const ogma = this.getOgma();
    if (!ogma) {
      console.log('Ogma not available, cannot add graph to viz');
      return false;
    }
    try {
      const addedGraph = await ogma.addGraph(itemsToAdd, {ignoreInvalid: true});

      // select added nodes
      ogma.clearSelection();
      addedGraph.nodes.setSelected(true);

      // layout only newly added nodes
      const previousNodes = addedGraph.nodes.inverse();
      await previousNodes.setAttribute('layoutable', false);
      try {
        await ogma.layouts.force({locate: true});
      } finally {
        await previousNodes.setAttribute('layoutable', true);
      }
      return true;
    } catch (e) {
      console.warn('Could not add node/edge in LKE', e);
      return false;
    }
  }

  private getOgma(): OgmaInterface | undefined {
    try {
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return (window.parent?.ogma ?? window.opener?.ogma ?? undefined) as OgmaInterface | undefined;
    } catch (e) {
      console.log('Could not reach Ogma: ' + asError(e).message);
      return undefined;
    }
  }

  private async showImportConfirmation(addedInLKE: boolean): Promise<void> {
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

  public closePlugin(): void {
    const inIframe = window.parent !== window;
    if (inIframe) {
      this.api.server.frontend.closeModal();
    } else {
      window.close();
    }
  }

  async deleteIntegration(integrationId: string): Promise<void> {
    await this.ui.longTask.run(async (p) => {
      p.update(STRINGS.ui.editIntegration.deletingIntegration);
      await this.config.deleteIntegration(integrationId);
      p.update(STRINGS.ui.global.done);
    });
  }

  private async importNeighbors(
    int: VendorIntegrationPublic,
    resultToImport: VendorResult,
    newNodeId: string,
    p: IWaitingMessage<unknown>,
    itemsToAdd: {nodes: LkNode[]; edges: LkEdge[]}
  ): Promise<void> {
    let failedNodes = 0;
    let failedEdges = 0;
    const neighbors = resultToImport.neighbors ?? [];
    const totalNodes = neighbors.length + 1;

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
  }
}

interface OgmaInterface {
  clearSelection: () => void;
  addGraph: (
    graph: {nodes: LkNode[]; edges: LkEdge[]},
    options: {ignoreInvalid: boolean}
  ) => Promise<{nodes: OgmaNodeList; edges: OgmaEdgeList}>;
  layouts: {
    force: (params: {locate: boolean}) => Promise<void>;
  };
}

interface OgmaNodeList {
  setSelected(s: boolean): void;
  locate(): Promise<void>;
  getId(): string[];
  inverse(): OgmaNodeList;
  setAttribute(path: 'layoutable', value: boolean): Promise<OgmaNodeList>;
}

interface OgmaEdgeList {}
