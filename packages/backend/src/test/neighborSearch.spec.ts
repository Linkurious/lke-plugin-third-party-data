import {it, describe} from 'node:test';
import * as assert from 'node:assert';

import {LkEdge, LkNode, RestClient} from '@linkurious/rest-client';

import {Searcher} from '../services/vendor/searcher';
import {Logger} from '../services/logger';
import {Configuration} from '../services/configuration';
import {MyPluginConfig} from '../../../shared/myPluginConfig';
import {API} from '../server/api';
import {SearchOptions} from '../models/searchOptions';
import {IntegrationModel, NeighborNodeFilter} from '../../../shared/integration/IntegrationModel';
import {
  NeighborGroup,
  VendorIntegrationPublic
} from '../../../shared/integration/vendorIntegrationPublic';

function node(id: string, category: string, properties: LkNode['data']['properties']): LkNode {
  return {
    id: id,
    data: {
      categories: [category],
      properties: properties,
      geo: {},
      readAt: 0,
      isVirtual: false,
      statistics: undefined
    }
  };
}

function edge(id: string, source: string, target: string, type: string): LkEdge {
  return {
    id: id,
    source: source,
    target: target,
    data: {type: type, properties: {}, readAt: 0, isVirtual: false}
  } as LkEdge;
}

function integrationModel(
  inputNeighborNodes: NeighborNodeFilter[],
  searchQueryFieldMapping: IntegrationModel['searchQueryFieldMapping']
): IntegrationModel {
  return {
    id: 'ch',
    vendorKey: 'company-house-uk',
    adminSettings: {apiKey: 'fake'},
    sourceKey: 'abc123',
    inputNodeCategory: 'Company',
    inputNeighborNodeFilters: inputNeighborNodes,
    outputNodeCategory: 'Company_details',
    outputEdgeType: 'has_details',
    searchQueryFieldMapping: searchQueryFieldMapping,
    outputNodeFieldMapping: [],
    searchResponseFieldSelection: []
  };
}

const companyNode = node('1', 'Company', {name: 'Facebook'});

void describe('VendorIntegrationPublic.getSearchQuery with neighbors', () => {
  const integration = new VendorIntegrationPublic(
    integrationModel(
      [{edgeType: 'located_at', nodeCategory: 'Address'}, {nodeCategory: 'Address'}],
      [
        {type: 'property', inputPropertyKey: 'name', outputPropertyKey: 'q'},
        {
          type: 'neighborProperty',
          inputNodeCategory: 'Address',
          inputPropertyKey: 'city',
          outputPropertyKey: 'restrictions'
        }
      ]
    )
  );
  const [locatedAt, anyEdge] = integration.getInputNeighborNodeFilters();

  void it('should use the first neighbor of the first non-empty matching group', () => {
    const groups: NeighborGroup[] = [
      {neighborNodeFilter: locatedAt, nodes: []},
      {
        neighborNodeFilter: anyEdge,
        nodes: [node('2', 'Address', {city: 'London'}), node('3', 'Address', {city: 'Paris'})]
      }
    ];
    assert.deepStrictEqual(integration.getSearchQuery(companyNode, groups), {
      q: 'Facebook',
      restrictions: 'London'
    });
  });

  void it('should prefer groups in neighbor nodes definition order', () => {
    const groups: NeighborGroup[] = [
      {neighborNodeFilter: locatedAt, nodes: [node('2', 'Address', {city: 'London'})]},
      {neighborNodeFilter: anyEdge, nodes: [node('3', 'Address', {city: 'Paris'})]}
    ];
    assert.deepStrictEqual(integration.getSearchQuery(companyNode, groups).restrictions, 'London');
  });

  void it('should skip the mapping when there is no neighbor', () => {
    assert.deepStrictEqual(integration.getSearchQuery(companyNode), {q: 'Facebook'});
  });

  void it('should skip the mapping when the neighbor property is invalid', () => {
    const groups = [
      {
        neighborNodeFilter: locatedAt,
        nodes: [
          node('2', 'Address', {
            city: {status: 'invalid', value: 1, original: 1}
          } as unknown as LkNode['data']['properties'])
        ]
      }
    ] as unknown as NeighborGroup[];
    assert.deepStrictEqual(integration.getSearchQuery(companyNode, groups), {q: 'Facebook'});
  });

  void it('should throw when a required field mapped to a neighbor is missing', () => {
    const requiredIntegration = new VendorIntegrationPublic(
      integrationModel(
        [{nodeCategory: 'Person'}],
        [
          {
            type: 'neighborProperty',
            inputNodeCategory: 'Person',
            inputPropertyKey: 'name',
            outputPropertyKey: 'q'
          }
        ]
      )
    );
    assert.throws(() => requiredIntegration.getSearchQuery(companyNode), /Person\.name/);
  });
});

void describe('Searcher.getInputNeighbors', () => {
  const logger = new Logger();
  const searchOptions = SearchOptions.from({integrationId: 'ch', sourceKey: 'abc123', nodeId: '1'});

  function searcher(
    inputNeighborNodes: NeighborNodeFilter[],
    withNeighborMapping = true
  ): Searcher {
    const config: MyPluginConfig = {
      basePath: '/',
      debugPort: undefined,
      integrations: [
        integrationModel(inputNeighborNodes, [
          {type: 'property', inputPropertyKey: 'name', outputPropertyKey: 'q'},
          ...(withNeighborMapping
            ? [
                {
                  type: 'neighborProperty' as const,
                  inputNodeCategory: 'Address',
                  inputPropertyKey: 'city',
                  outputPropertyKey: 'restrictions'
                }
              ]
            : [])
        ])
      ]
    };
    return new Searcher(
      logger,
      new Configuration(config, undefined as unknown as API, logger),
      'ch'
    );
  }

  function stubApi(nodes: LkNode[], edges: LkEdge[]): {api: RestClient; calls: unknown[]} {
    const calls: unknown[] = [];
    const api = {
      graphNode: {
        getAdjacentNodes: (params: unknown) => {
          calls.push(params);
          return Promise.resolve({isSuccess: () => true, body: {nodes: nodes, edges: edges}});
        }
      }
    } as unknown as RestClient;
    return {api: api, calls: calls};
  }

  const home = node('10', 'Address', {city: 'London'});
  const office = node('11', 'Address', {city: 'Paris'});
  const other = node('12', 'Address', {city: 'Berlin'});
  const person = node('13', 'Person', {name: 'Mark'});

  void it('should group neighbors by edge type and category, in any direction', async () => {
    const s = searcher([
      {edgeType: 'located_at', nodeCategory: 'Address'},
      {nodeCategory: 'Address'}
    ]);
    const {api, calls} = stubApi(
      [companyNode, home, office, other, person],
      [
        edge('e1', '1', '10', 'located_at'),
        edge('e2', '11', '1', 'has_office'),
        edge('e3', '11', '12', 'located_at'), // not linked to the input node
        edge('e4', '1', '13', 'located_at') // not a configured category
      ]
    );
    const groups = await s['getInputNeighbors'](api, searchOptions);
    assert.deepStrictEqual(
      groups.map((g) => g.nodes.map((n) => n.id)),
      [['10'], ['10', '11']]
    );
    assert.deepStrictEqual(calls, [
      {
        sourceKey: 'abc123',
        ids: ['1'],
        nodeCategories: ['Address'],
        edgeTypes: undefined,
        withDigest: false,
        withDegree: false
      }
    ]);
  });

  void it('should filter out neighbors linked by another edge type', async () => {
    const s = searcher([{edgeType: 'located_at', nodeCategory: 'Address'}]);
    const {api, calls} = stubApi(
      [home, office],
      [edge('e1', '10', '1', 'located_at'), edge('e2', '1', '11', 'has_office')]
    );
    const groups = await s['getInputNeighbors'](api, searchOptions);
    assert.deepStrictEqual(
      groups.map((g) => g.nodes.map((n) => n.id)),
      [['10']]
    );
    assert.deepStrictEqual((calls[0] as {edgeTypes: string[]}).edgeTypes, ['located_at']);
  });

  void it('should not fetch neighbors when no mapping uses them', async () => {
    const s = searcher([{nodeCategory: 'Address'}], false);
    const {api, calls} = stubApi([], []);
    assert.deepStrictEqual(await s['getInputNeighbors'](api, searchOptions), []);
    assert.deepStrictEqual(calls, []);
  });
});
