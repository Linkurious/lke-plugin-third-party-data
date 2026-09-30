import {LkNode, RestClient} from '@linkurious/rest-client';

import {SearchOptions} from '../../models/searchOptions';
import {Configuration} from '../configuration';
import {VendorResult} from '../../../../shared/api/response';
import {VendorIntegration} from '../../../../shared/integration/vendorIntegration';
import {NeighborGroup} from '../../../../shared/integration/vendorIntegrationPublic';
import {STRINGS} from '../../../../shared/strings';
import {DetailsOptions} from '../../models/detailsOptions';
import {Logger, WithLogger} from '../logger';
import {VendorContext} from '../../../../shared/vendor/vendorContext';

import {DetailsSearchDriver, SearchDriver} from './searchDriver';
import {AnnuaireEntreprisesDriver} from './driver/annuaireEntreprisesDriver';
import {DnbPeopleLookupDriver} from './driver/dnbPeopleLookupDriver';
import {CompanyHouseUkDriver} from './driver/companyHouseUkDriver';

const SEARCH_DRIVERS: SearchDriver[] = [
  new AnnuaireEntreprisesDriver(),
  new DnbPeopleLookupDriver(),
  new CompanyHouseUkDriver()
];

export class Searcher extends WithLogger {
  public readonly integration: VendorIntegration;

  constructor(logger: Logger, config: Configuration, integrationId: string) {
    super(logger);
    this.integration = config.getIntegrationById(integrationId);
  }

  async getSearchResults(
    api: RestClient,
    searchOptions: SearchOptions,
    context: VendorContext
  ): Promise<VendorResult[]> {
    const inputNodeR = await api.graphNode.getNode({
      sourceKey: searchOptions.sourceKey,
      id: searchOptions.nodeId,
      edgesTo: undefined,
      withDigest: false,
      withDegree: false
    });
    if (!inputNodeR.isSuccess()) {
      throw new Error(
        `Failed to get input node #${searchOptions.nodeId}: ${inputNodeR.body.message}`
      );
    }
    const inputNode = inputNodeR.body.nodes[0];
    const neighborGroups = await this.getInputNeighbors(api, searchOptions);

    const driver = this.getSearchDriver();
    const searchQuery = this.integration.getSearchQuery(inputNode, neighborGroups);
    this.logger.info(`${this.integration.vendor.key}.search: ` + JSON.stringify(searchQuery));
    return driver.search(searchQuery, this.integration, searchOptions.maxResults, context);
  }

  private async getInputNeighbors(
    api: RestClient,
    searchOptions: SearchOptions
  ): Promise<NeighborGroup[]> {
    const neighborNodes = this.integration.getInputNeighborNodes();
    if (neighborNodes.length === 0 || !this.integration.hasNeighborPropertyMapping()) {
      return [];
    }

    const anyEdge = neighborNodes.some((n) => n.edgeType === undefined);
    const neighborNodesR = await api.graphNode.getAdjacentNodes({
      sourceKey: searchOptions.sourceKey,
      ids: [searchOptions.nodeId],
      nodeCategories: Array.from(new Set(neighborNodes.map((n) => n.nodeCategory))),
      // request adjacent nodes with the best edge type adjusting
      edgeTypes: anyEdge
        ? undefined
        : Array.from(new Set(neighborNodes.map((n) => n.edgeType as string))),
      withDigest: false,
      withDegree: false
    });
    if (!neighborNodesR.isSuccess()) {
      throw new Error(
        `Failed to get neighbors of input node #${searchOptions.nodeId}: ${neighborNodesR.body.message}`
      );
    }

    const nodesById = new Map<string, LkNode>(neighborNodesR.body.nodes.map((n) => [n.id, n]));
    const groups: NeighborGroup[] = neighborNodes.map((neighborNode) => ({
      neighborNode: neighborNode,
      nodes: []
    }));
    for (const edge of neighborNodesR.body.edges) {
      let neighborId: string;
      // match edge regardless of direction
      if (edge.source === searchOptions.nodeId) {
        neighborId = edge.target;
      } else if (edge.target === searchOptions.nodeId) {
        neighborId = edge.source;
      } else {
        continue;
      }
      const neighbor = nodesById.get(neighborId);
      // ignore self edges on input node
      if (!neighbor || neighborId === searchOptions.nodeId) {
        continue;
      }

      // group neighbor nodes by category and edge type
      for (const group of groups) {
        if (
          neighbor.data.categories.includes(group.neighborNode.nodeCategory) &&
          (group.neighborNode.edgeType === undefined ||
            group.neighborNode.edgeType === edge.data.type) &&
          !group.nodes.includes(neighbor)
        ) {
          group.nodes.push(neighbor);
        }
      }
    }
    return groups;
  }

  async getDetails(detailsOptions: DetailsOptions, context: VendorContext): Promise<VendorResult> {
    if (this.integration.vendor.strategy === 'search') {
      throw new Error(
        `get-details is not supported for this strategy (vendor: ${this.integration.vendor.key})`
      );
    }
    const driver = this.getSearchDriver() as DetailsSearchDriver;
    this.logger.info(`${this.integration.vendor.key}.details: ` + JSON.stringify(detailsOptions));
    return driver.getDetails(this.integration, detailsOptions, context);
  }

  private getSearchDriver(): SearchDriver {
    const driver = SEARCH_DRIVERS.find((d) => d.vendorKey === this.integration.vendor.key);
    if (!driver) {
      throw new Error(STRINGS.errors.search.vendorNotFound(this.integration));
    }
    return driver;
  }
}
