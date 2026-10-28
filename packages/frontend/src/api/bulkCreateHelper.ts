import {NodeParams, EdgeParams, LkEdge, LkNode} from '@linkurious/rest-client';
import {GenericObject} from '@linkurious/rest-client/dist/src/api/commonTypes';

import {VendorResult} from '../../../shared/api/response.ts';
import {VendorIntegrationPublic} from '../../../shared/integration/vendorIntegrationPublic.ts';

import {API} from './api.ts';

// "to create" data before creating anything
interface PathToCreate {
  /**
   * - null means "the source node of the search"
   * - a numerical value is to be resolved as the ìndex` property of an entry in the `pathsToCreate` array
   */
  sourceNodeIndex: number | null;
  index: number;
  nodeCategory: string;
  edgeType: string;
  nodeProperties: GenericObject;
  edgeProperties: GenericObject;
  nodeKeyProperty?: string;
  edgeKeyProperty?: string;
}

// "to create" data after creating/merging nodes
interface MatchedNodePath extends PathToCreate {
  node: LkNode;
}

// "to create" data after creating/merging edges
interface MatchedEdgePath extends MatchedNodePath {
  edge: LkEdge;
}

type ProgressCallback = (
  p:
    | {type: 'nodes' | 'edges'; total: number; done: number}
    | {type: 'nodeError' | 'edgeError'; categoryOrType: string; error: Error}
) => void;

/**
 * Help to bulk-create nodes and edges from a set of vendor results.
 * General logic:
 * - extract a list of "paths to create" from the vendor results
 * - bulk-create nodes for each category, storing the created/matched node IDs for each path
 * - bulk-create edges for each edge type, using the stored node IDs
 *
 * A "path to create" represents:
 * - a target node to create (with its category and properties)
 * - the reference of the source node (either the "selected node" or the index of another node in the paths results)
 * - an edge to create between the "source node" and the target node (with its type and properties)
 */
export class BulkCreateHelper {
  private readonly api: API;
  private readonly pathsToCreate: PathToCreate[];
  private readonly int: VendorIntegrationPublic;

  constructor(api: API, results: VendorResult[], int: VendorIntegrationPublic) {
    this.api = api;
    this.pathsToCreate = BulkCreateHelper.parsePathsToCreate(results, int);
    this.int = int;
  }

  static parsePathsToCreate(results: VendorResult[], int: VendorIntegrationPublic): PathToCreate[] {
    const paths: PathToCreate[] = [];
    let index = 0;
    for (const result of results) {
      const parentIndex = index++;
      paths.push({
        index: parentIndex,
        sourceNodeIndex: null,
        nodeCategory: int.getOutputTypes().outputNodeCategory,
        // for the main node, we use the property-mapping to transform the raw output properties into the final node properties
        nodeProperties: int.mapMainNodeProperties(result.properties),
        edgeType: int.getOutputTypes().outputEdgeType,
        edgeProperties: result.edgeProperties ?? {},
        nodeKeyProperty: result.keyProperty,
        edgeKeyProperty: result.edgeKeyProperty
      });
      for (const neighbor of result.neighbors ?? []) {
        paths.push({
          index: index++,
          sourceNodeIndex: parentIndex,
          nodeCategory: neighbor.nodeCategory,
          // there is no property-mapping for neighbor nodes, we use the raw output properties
          nodeProperties: neighbor.properties,
          edgeType: neighbor.edgeType,
          edgeProperties: int.getNeighborEdgeProperties(neighbor),
          nodeKeyProperty: neighbor.keyProperty,
          edgeKeyProperty: neighbor.edgeKeyProperty
        });
      }
    }
    return paths;
  }

  async createPaths(
    selectedNodeId: string,
    progress: ProgressCallback
  ): Promise<{nodes: LkNode[]; edges: LkEdge[]}> {
    // create or match all nodes, store the created/matched node IDs for each path
    const matchedNodePaths = await this.createNodes(this.pathsToCreate, progress);

    // create or match all edges
    const edges = await this.createEdges(matchedNodePaths, selectedNodeId, progress);

    return {
      nodes: matchedNodePaths.map((p) => p.node),
      edges: edges.map((p) => p.edge)
    };
  }

  private async createNodes(
    pathsToCreate: PathToCreate[],
    progress: ProgressCallback
  ): Promise<MatchedNodePath[]> {
    // group paths by node category, so we can bulk-create them in batches
    const pathsByNodeCategory: Record<string, PathToCreate[]> = {};
    for (const path of pathsToCreate) {
      if (!pathsByNodeCategory[path.nodeCategory]) {
        pathsByNodeCategory[path.nodeCategory] = [];
      }
      pathsByNodeCategory[path.nodeCategory].push(path);
    }

    // as we create nodes, store the node ID for each index in the pathsToCreate array
    const matchedNodePaths = new Array<MatchedNodePath>();

    // bulk-create nodes for each category
    for (const [nodeCategory, paths] of Object.entries(pathsByNodeCategory)) {
      console.log(`Creating ${paths.length} nodes of category "${nodeCategory}"...`);
      const dupConfig = this.int.getDuplicateConfig(paths[0].nodeKeyProperty);
      const response = await this.api.server.graphNode.bulkCreateNodes({
        nodes: paths.map((p) => BulkCreateHelper.toNodeParams(p)),
        sourceKey: this.int.getSourceKey(),
        duplicateConfig: dupConfig
      });
      if (!response.isSuccess()) {
        const e = new Error(
          `Failed to create nodes (${response.body.key}): ${response.body.message}`
        );
        progress({type: 'nodeError', categoryOrType: nodeCategory, error: e});
        throw e;
      }
      if (response.body.items.length !== paths.length) {
        const e = new Error(
          `Failed to bulk create nodes: expected ${paths.length} results, got ${response.body.items.length}`
        );
        progress({type: 'nodeError', categoryOrType: nodeCategory, error: e});
        throw e;
      }

      // store the matched node IDs for each path index, so we can create edges later
      // note: this works because `response.items` is guaranteed to be in the same order as the input `paths`
      matchedNodePaths.push(
        ...paths.map((p, i) => ({
          ...p,
          node: response.body.items[i]
        }))
      );

      // notify progress
      progress({type: 'nodes', total: pathsToCreate.length, done: matchedNodePaths.length});
    }
    return matchedNodePaths;
  }

  private static toNodeParams(path: PathToCreate): NodeParams {
    return {
      categories: [path.nodeCategory],
      properties: path.nodeProperties
    };
  }

  private static toEdgeParams(
    edgePath: MatchedNodePath,
    matchedNodePaths: MatchedNodePath[],
    selectedNodeId: string,
    progress: ProgressCallback
  ): EdgeParams {
    let sourceNodeId: string;
    if (edgePath.sourceNodeIndex === null) {
      sourceNodeId = selectedNodeId;
    } else {
      const sourcePath = matchedNodePaths.find((p) => edgePath.sourceNodeIndex === p.index);
      if (!sourcePath) {
        const e = new Error(
          `Failed to find source node for edge (source node index: ${edgePath.sourceNodeIndex})`
        );
        progress({type: 'edgeError', categoryOrType: edgePath.edgeType, error: e});
        throw e;
      }
      sourceNodeId = sourcePath.node.id;
    }
    return {
      source: sourceNodeId,
      target: edgePath.node.id,
      type: edgePath.edgeType,
      properties: edgePath.edgeProperties
    };
  }

  /**
   * Bulk-create edges.
   */
  private async createEdges(
    matchedNodePaths: MatchedNodePath[],
    selectedNodeId: string,
    progress: ProgressCallback
  ): Promise<MatchedEdgePath[]> {
    // group edges to create by edge type, so we can bulk-create them in batches
    const edgesToCreateByEdgeType: Record<string, MatchedNodePath[]> = {};
    for (const path of matchedNodePaths) {
      if (!edgesToCreateByEdgeType[path.edgeType]) {
        edgesToCreateByEdgeType[path.edgeType] = [];
      }
      edgesToCreateByEdgeType[path.edgeType].push(path);
    }

    const matchedEdgePaths: MatchedEdgePath[] = [];

    // bulk-create edges for each edge type
    for (const [edgeType, paths] of Object.entries(edgesToCreateByEdgeType)) {
      console.log(`Creating ${paths.length} edges of type "${edgeType}"...`);
      const dupConfig = this.int.getDuplicateConfig(paths[0].edgeKeyProperty);
      const response = await this.api.server.graphEdge.bulkCreateEdges({
        edges: paths.map((p) =>
          BulkCreateHelper.toEdgeParams(p, matchedNodePaths, selectedNodeId, progress)
        ),
        sourceKey: this.int.getSourceKey(),
        duplicateConfig: dupConfig
      });
      if (!response.isSuccess()) {
        const e = new Error(
          `Failed to create edges (${response.body.key}): ${response.body.message}`
        );
        progress({type: 'edgeError', categoryOrType: edgeType, error: e});
        throw e;
      }
      if (response.body.items.length !== paths.length) {
        const e = new Error(
          `Failed to bulk create edges: expected ${paths.length} results, got ${response.body.items.length}`
        );
        progress({type: 'edgeError', categoryOrType: edgeType, error: e});
        throw e;
      }

      // store the matched edge IDs for each path index, so we can return them later
      // note: this works because `response.items` is guaranteed to be in the same order as the input `paths`
      matchedEdgePaths.push(
        ...paths.map((p, i) => ({
          ...p,
          edge: response.body.items[i]
        }))
      );

      // notify progress
      progress({type: 'edges', total: matchedNodePaths.length, done: matchedEdgePaths.length});
    }

    return matchedEdgePaths;
  }
}
