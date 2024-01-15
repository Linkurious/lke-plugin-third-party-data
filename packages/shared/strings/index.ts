import {LkError} from '@linkurious/rest-client';

import {VendorField, VendorFieldTypeName} from '../vendor/vendorModel';
import {
  ConstantFieldMapping,
  ConstantFieldTypeName,
  FieldMapping
} from '../integration/IntegrationModel';
import {Vendor} from '../vendor/vendor';
import {GraphItemSchema, GraphPropertySchema} from '../api/response';
import {VendorIntegration} from '../integration/vendorIntegration';

export const STRINGS = {
  emptyStatePrefix: `To use this plugin, please set up an integration and run it via a Custom Action. For details, please check the `,
  emptyStateLinkText: 'online documentation',
  emptyStateLinkUrl: 'https://github.com/Linkurious/lke-plugin-third-party-data#readme',
  errors: {
    checkInputNodeMapping: {
      noMappingsDefined: 'At least one search query mapping must be defined',
      missingInputProperty: `Search query mapping: source node property must be defined`,
      requiredFieldMissing: (vf: VendorField): string =>
        `Search query mapping: required field "${vf.key}" is missing`,
      unknownField: (m: Partial<FieldMapping>): string =>
        `Search query mapping: vendor field "${m.outputPropertyKey}" is unknown`,
      invalidConstantType: (
        mapping: Partial<ConstantFieldMapping>,
        valueType: string,
        type: VendorFieldTypeName
      ): string =>
        `Search query mapping: constant value for "${mapping.outputPropertyKey}" is invalid (got ${valueType}, expected ${type})`,
      unknownMappingType: (type: string | undefined): string =>
        `Search query mapping: unknown mapping type "${type}"`,
      unknownProperty: (propertyKey: string, itemType: string): string =>
        `Search query mapping: unknown property "${propertyKey}" for node category "${itemType}"`,
      invalidPropertyType: (
        nodePropertySchema: GraphPropertySchema,
        vendorFieldType: VendorFieldTypeName
      ): string =>
        `Search query mapping: graph property "${nodePropertySchema.propertyKey}" is of type "${nodePropertySchema.type}" in the graph schema, but should be of type "${vendorFieldType}" to match the vendor field`
    },
    outputMapping: {
      emptyMapping: 'Output node mapping: at least one node field mapping must be defined',
      constantWithoutType: (mapping: Partial<FieldMapping>): string =>
        `Output node mapping: constant value type must be defined (property ${mapping.outputPropertyKey})`,

      outputNodeNotWritable: (outputNodeSchema: GraphItemSchema): string =>
        `Output node-category "${outputNodeSchema.itemType}" is not writable`,
      invalidType: (
        sourceKind: 'vendor field' | 'constant value',
        sourceType: ConstantFieldTypeName | VendorFieldTypeName,
        targetPropertySchema: GraphPropertySchema
      ): string =>
        `Output node mapping: ${sourceKind} of type "${sourceType}" cannot be assigned to node property "${targetPropertySchema.propertyKey}" of type "${targetPropertySchema.type}"`,
      unknownInputField: (sourceFieldKey: string): string =>
        `Output node mapping: unknown vendor property "${sourceFieldKey}"`,
      missingInputProperty: (outputProperty?: string): string =>
        `Output node mapping: source field key must be defined (input property: ${outputProperty})`
    },
    checkSearchQuery: {
      requiredFieldMissing: (
        vendor: Vendor,
        field: VendorField,
        missingProperties: string[]
      ): string =>
        `Search with ${vendor.key}: required search parameter ${
          field.key
        } is missing (input node properties: ${JSON.stringify(missingProperties)})`
    },
    searchOptions: {
      missingIntegrationId: 'Missing query-string parameter: integrationId',
      missingNodeId:
        'Missing query-string parameter: nodeId (hint: you possibly forgot to use a {{node}} entry in your action URL)',
      missingSourceKey:
        'Missing query-string parameter: sourceKey (hint: you possibly forgot to use a {{sourceKey}} entry in your action URL)',
      invalidMaxResults: 'Invalid query-string parameter: maxResults (must be a number)',
      invalidMaxResultsRange: (min: number, max: number): string =>
        `Invalid query-string parameter: maxResults (must be between ${min} and ${max})`
    },
    detailsOptions: {
      missingSearchResultId: 'Missing query-string parameter: searchResultId',
      missingIntegrationId: 'Missing query-string parameter: integrationId'
    },
    search: {
      vendorNotFound: (i: VendorIntegration): string =>
        `No search driver for vendor "${i.vendor.key}" (integration ${i.id})`,
      nodeNotFound: (params: {
        integrationId: string;
        sourceKey: string;
        nodeId: string;
      }): string => {
        return `Failed searching for Node ${params.nodeId} in source ${params.sourceKey}`;
      }
    },
    details: {
      detailsNotFound: (searchResultId: string): string =>
        `Could not fetch details for search result #${searchResultId}`
    },
    getAdminConfig: `Could not get the plugin's admin-configuration`,
    getUserConfig: `Could not get the plugin's user-configuration`,
    customActions: {
      loadFailed: (error: LkError): string => `Failed to get custom actions: ${error.message}`,
      deleteFailed: (error: LkError): string => `Failed to delete custom action: ${error.message}`
    },
    multiSelector: {
      listUndefined: 'Unexpected error: list is empty'
    },
    vendorSelector: {
      noVendorSelected: 'No vendor selected',
      missingRequiredField: (fieldName: string): string => `Missing required field: ${fieldName}`,
      invalidValue: (fieldName: string): string => `Invalid value for field ${fieldName}`
    },
    searchResultFieldSelectorEmpty: 'At least one field must be selected',
    importResult: {
      detailsNotFound: 'Could not fetch details for the selected result',
      failedToCreateNode: (error: LkError): string =>
        `Failed to create output node: ${error.message}`,
      failedToCreateEdge: (error: LkError): string =>
        `Failed to create output edge: ${error.message}`
    },
    missingAdminSetting: (vendor: Vendor, key: string): string =>
      `${vendor.key}: missing admin setting ${key}`,
    getIntegrationById: (integrationId: string): string =>
      `Integration not found: ${integrationId}`,
    getDataSources: (error: LkError): string =>
      `Get connected sources: could not get list of sources (${error.message})`,
    updateIntegratioNotFound: (integrationId: string): string =>
      `Cannot update integration ${integrationId}: integration not found`,
    integrationNotFound: (integrationId: string): string =>
      `Integration ${integrationId} was not found`
  },
  customAction: {
    name: (vendor: Vendor): string => `Fetch details from ${vendor.name}`,
    details: (vendor: Vendor): string =>
      `Get details from ${vendor.name} (action auto-generated by the third-party data plugin)`
  },
  ui: {
    mappingEditor: {
      constant: `Fixed value`,
      actionColumnHead: 'Action'
    },
    customActionManager: {
      title: 'Manage custom actions for this integration',
      description: `Custom actions are used to launch an integration from a node context-menu`,
      deleteButton: 'Delete',
      noCustomActions: `No custom action found for this integration, you can create one using the button bellow.`,
      addActionDescription: 'This will create a new custom action, shared at the data-source level',
      addButton: 'Add custom action',
      listTitle: (actions: number): string =>
        `Found ${actions} custom action(s) for this integration:`
    },
    global: {
      closeButton: 'Close',
      noValue: '(No value)',
      done: 'Done'
    },
    inputMappingEditor: {
      title: 'Search query mapping - [4/7]',
      description: 'Build the search query from the input node properties',
      inputTypeLabel: 'Input type',
      searchQueryFieldLabel: 'Search query field (* = required)',
      inputPropertyLabel: 'Input property',

      propertyInputType: (inputNodeType: string): string => `"${inputNodeType}" property`
    },
    outputMappingEditor: {
      title: 'Output node mapping - [7/7]',
      description: 'Build the new node properties from the vendor details',
      apiFieldLabel: 'API field',
      defaultMappingText: 'Use default mapping for all properties',
      clearMappingText: 'Remove all existing mappings',
      defaultMappingButton: 'Default mapping',
      clearMappingButton: 'Clear mapping',
      inputTypeLabel: 'Input type',
      fieldInputLabel: `API response field`
    },
    sourceSelector: {
      title: 'Select a data-source - [2/7]',
      description: 'Select a data-source for this integration'
    },
    vendorSelector: {
      title: 'Select third-party vendor API - [1/7]',
      description:
        'Select a third-party data vendor API for this new integration, and configure it.'
    },
    integrationEditor: {
      selectInputNodeTypeTitle: 'Select the input node-category - [3/7]',
      selectInputNodeTypeDescription:
        'Select the node-category of the node that will be used as input for this integration',
      selectOutputNodeTypeTitle: 'Select the output node-category - [6/7]',
      selectOutputNodeTypeDescription:
        'Select the node-category of the node that will be created as output of this integration'
    },
    searchResultFieldSelector: {
      title: 'Search result display - [5/7]',
      description: 'Select the response fields to display in the search results'
    },
    integrationList: {
      title: 'Integrations list',
      actionsHeader: 'Actions',
      editButton: 'Edit',
      installButton: 'Install',
      deleteButton: 'Delete',
      addButton: 'Add integration',
      vendorHeader: 'Vendor API',
      dataSourceHeader: 'Data-Source',
      inputNodeHeader: 'Input node',
      outputNodeHeader: 'Output node'
    },
    popin: {
      info: 'Information',
      error: 'Error'
    },
    searchResults: {
      detailsModalTitle: 'Search result details',
      detailsButton: `View details`,
      title: `Search results`,
      noResults: 'No results found.',
      importButton: `Import result`
    },
    editIntegration: {
      savingNewIntegration: 'Saving new integration...',
      savingIntegration: 'Updating integration',
      deletingIntegration: 'Deleting integration...',
      restartingPlugin:
        'Applying changes: this requires restarting the plugin (this can take several seconds)...'
    },
    importSearchResult: {
      creatingNode: 'Creating output node...',
      creatingEdge: 'Creating output edge...',
      successfullyCreatedAndAdded: `Successfully imported search result in the graph. The visualization has been updated.`,
      successfullyCreated: `Successfully imported search result in the graph.`,
      confirmModalCloseButton: 'Close window',
      gettingDetails: 'Getting details for the selected result',
      title: 'Success'
    },
    integrationCreated: {
      title: 'Integration created successfully',
      message: `The new integration was successfully saved. You can install this integration by adding a custom action to launch it from a node's context menu.`,
      createCustomActionButton: 'Install integration',
      dontCreateCustomActionButton: 'Later'
    }
  }
};
