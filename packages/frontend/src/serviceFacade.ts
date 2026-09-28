import {LkEdge, LkError, LkNode, Response, User} from '@linkurious/rest-client';

import {VendorResult} from '../../shared/api/response';
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
import {BulkCreateHelper} from './api/bulkCreateHelper.ts';

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

      const bulkCreate = new BulkCreateHelper(this.api, resolvedResults, int);
      const itemsToAdd = await bulkCreate.createPaths(inputNodeId, (progress) => {
        if (progress.type === 'nodes') {
          p.update(
            `${STRINGS.ui.importSearchResult.creatingNode} (${progress.done}/${progress.total})`
          );
        } else if (progress.type === 'edges') {
          p.update(
            `${STRINGS.ui.importSearchResult.creatingEdge} (${progress.done}/${progress.total})`
          );
        } else if (progress.type === 'nodeError') {
          apiErrors.push(STRINGS.ui.importSearchResult.failBulkNodes(progress.categoryOrType));
        } else if (progress.type === 'edgeError') {
          apiErrors.push(STRINGS.ui.importSearchResult.failBulkEdges(progress.categoryOrType));
        }
      });

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
