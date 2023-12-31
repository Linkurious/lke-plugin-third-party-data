import {User} from '@linkurious/rest-client';
import {CustomAction} from '@linkurious/rest-client/dist/src/api/CustomAction/types';

import {VendorSearchResponse} from '../../../shared/api/response';
import {
  IntegrationModel,
  IntegrationModelPublic
} from '../../../shared/integration/IntegrationModel';

import {ApiMock} from './devServer';

const defaultIntegrationId = 'azerty';
const validSourceKey = 'abc123';
const outputNodeType = 'Person_details';
const outputEdgeType = 'has_details';

const mockUser: User = {
  source: 'local',
  username: 'test',
  email: 'test@test.com',
  id: 1,
  groups: [{name: 'admin', id: 5, sourceKey: '*'}],
  actions: {},
  accessRights: {},
  createdAt: '2021-01-01T00:00:00.000Z',
  updatedAt: '2021-01-01T00:00:00.000Z',
  preferences: {pinOnDrag: false, locale: 'en', incrementalLayout: false}
};
const publicIntegrationModel: IntegrationModelPublic = {
  id: defaultIntegrationId,
  vendorKey: 'dnb',
  sourceKey: validSourceKey,
  inputNodeCategory: 'Person',
  searchQueryFieldMapping: [
    {outputPropertyKey: 'firstName', type: 'property', inputPropertyKey: 'full_name'},
    {outputPropertyKey: 'lastName', type: 'property', inputPropertyKey: 'full_name'},
    {outputPropertyKey: 'age', type: 'property', inputPropertyKey: 'age'},
    {outputPropertyKey: 'suspicious', type: 'constant', valueType: 'boolean', value: true}
  ],
  searchResponseFieldSelection: ['firstName', 'lastName'],
  outputEdgeType: outputEdgeType,
  outputNodeCategory: outputNodeType,
  outputNodeFieldMapping: [
    {type: 'property', inputPropertyKey: 'citizenship', outputPropertyKey: 'country'},
    {type: 'property', inputPropertyKey: 'listed', outputPropertyKey: 'listed'},
    {
      type: 'constant',
      outputPropertyKey: 'via',
      valueType: 'string',
      value: 'dnb'
    }
  ]
};

const adminIntegrationModel: IntegrationModel = {
  ...publicIntegrationModel,
  adminSettings: {
    test3: 'b'
  }
};

export const API_MOCKS: ApiMock[] = [
  {
    match: '/plugins/3d/api/admin-config',
    response: {
      body: {
        basePath: '3d',
        integrations: [adminIntegrationModel]
      }
    }
  },
  {
    match: '/plugins/3d/api/config',
    response: {
      body: {
        basePath: '3d',
        integrations: [publicIntegrationModel]
      }
    }
  },
  {
    match: `/plugins/3d/api/search`, // queryString: integrationId, nodeId, sourceKey
    response: {
      body: {
        integrationId: publicIntegrationModel.id,
        inputNodeId: '123',
        vendorKey: 'dnb',
        results: [
          {
            id: 'vendor:dnb:abc',
            properties: {
              firstName: 'Patrick',
              lastName: 'Starfish',
              address: '10, Fish street, Bikini Bottoms',
              age: 12,
              suspicious: true
            }
          },
          {
            id: 'vendor:dnb:xyz',
            properties: {
              firstName: 'Bob',
              lastName: 'Sponge',
              address: '12, Pineapple street, Bikini Bottoms',
              age: 11,
              suspicious: true
            }
          }
        ]
      } as VendorSearchResponse
    }
  },
  {
    // update the server config (when creating an integration)
    verb: 'POST',
    match: '/api/config',
    response: {
      body: {}
    }
  },
  {
    // create the output node
    verb: 'POST',
    match: `/api/${validSourceKey}/graph/nodes`,
    response: {
      body: {
        id: '4568',
        data: {
          categories: [outputNodeType],
          properties: {
            firstName: 'Patrick',
            lastName: 'Starfish',
            address: '10, Fish street, Bikini Bottoms',
            age: 12,
            suspicious: true
          },
          geo: {},
          statistics: {},
          readAt: 0
        }
      }
    }
  },
  {
    // create the output edge
    verb: 'POST',
    match: `/api/${validSourceKey}/graph/edges`,
    response: {
      body: {
        id: '999',
        source: '4568',
        target: '12',
        data: {
          type: outputEdgeType,
          properties: {},
          statistics: {},
          readAt: 0
        }
      }
    }
  },
  // check currently connected user
  {
    match: '/api/auth/me',
    response: {
      body: mockUser
    }
  },
  // list data-sources
  {
    match: '/api/dataSources',
    response: {
      body: [
        {
          key: validSourceKey,
          name: 'Source 1',
          state: 'ready',
          connected: true
        },
        {
          key: 'xyz789',
          name: 'Source 2',
          state: 'ready',
          connected: true
        }
      ]
    }
  },
  // get node schema for valid data-source
  {
    match: `/api/${validSourceKey}/graph/schema/node/types`,
    response: {
      body: {
        access: 'read',
        results: [
          {
            itemType: 'Person',
            access: 'write',
            visibility: 'searchable',
            properties: [
              {
                propertyKey: 'full_name',
                propertyType: {name: 'string'},
                visibility: 'searchable',
                access: 'write'
              },
              {
                propertyKey: 'age',
                propertyType: {name: 'number'},
                visibility: 'visible',
                access: 'write'
              }
            ]
          },
          {
            itemType: 'Company',
            access: 'write',
            visibility: 'searchable',
            properties: [
              {
                propertyKey: 'name',
                propertyType: {name: 'string'},
                visibility: 'searchable',
                access: 'write'
              },
              {
                propertyKey: 'year_founded',
                propertyType: {name: 'number'},
                visibility: 'visible',
                access: 'write'
              }
            ]
          },
          {
            itemType: 'Person_details',
            access: 'write',
            visibility: 'searchable',
            properties: [
              {
                propertyKey: 'country',
                propertyType: {name: 'string'},
                visibility: 'searchable',
                access: 'write'
              },
              {
                propertyKey: 'listed',
                propertyType: {name: 'boolean'},
                visibility: 'visible',
                access: 'write'
              },
              {
                propertyKey: 'details',
                propertyType: {name: 'auto'},
                visibility: 'searchable',
                access: 'write'
              }
            ]
          }
        ]
      }
    }
  },
  // lit custom actions for valid data-source
  {
    match: `/api/${validSourceKey}/customAction`,
    response: {
      body: [
        {
          id: 1,
          name: 'fetch person info from DnB',
          description: 'fetch person info from DnB yeah and some details too',
          sourceKey: validSourceKey,
          urlTemplate: `{{baseURL}}plugin/3d/?integrationId=${defaultIntegrationId}&nodeId={{node}}&sourceKey={{sourceKey}}&noise=1234356743245678543234567865432134567865432`
        },
        {
          id: 2,
          name: 'other action',
          description: 'this action is unrelated to this plugin',
          sourceKey: validSourceKey,
          urlTemplate: `{{baseURL}}plugin/image-export/?viz={{visualization}}&sourceKey={{sourceKey}}`
        }
      ] as CustomAction[]
    }
  },
  // create custom action
  {
    verb: 'POST',
    match: `/api/${validSourceKey}/customAction`,
    response: {
      body: {},
      status: 201
    }
  }
];
