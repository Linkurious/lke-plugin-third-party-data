import {
  DuplicateConfig,
  DuplicateStrategy,
  LkNode,
  PluginAction,
  NodeParams,
  EdgeParams
} from '@linkurious/rest-client';

import {NeighborResult} from '../api/response';
import {AbstractFields, VendorFieldType} from '../vendor/vendorModel';
import {Vendor} from '../vendor/vendor';
import {Vendors} from '../vendor/vendors';
import {STRINGS} from '../strings';

import {
  FieldMapping,
  IntegrationModelPublic,
  NeighborNode,
  NeighborPropertyFieldMapping
} from './IntegrationModel';

// Nodes matching a NeighborNode definition
export interface NeighborGroup {
  neighborNode: NeighborNode;
  nodes: LkNode[];
}

export class VendorIntegrationPublic<VI extends IntegrationModelPublic = IntegrationModelPublic> {
  protected readonly model: VI;
  public readonly vendor: Vendor;

  constructor(model: VI) {
    this.model = model;
    this.vendor = Vendors.getVendorByKey(this.model.vendorKey);
  }

  get id(): string {
    return this.model.id;
  }

  mapMainNodeProperties(rawProperties: AbstractFields): Required<NodeParams>['properties'] {
    const nodeProperties: Required<NodeParams>['properties'] = {};
    for (const mapping of this.model.outputNodeFieldMapping) {
      const inputValue = this.getVendorInputValue(mapping, rawProperties);
      if (inputValue === undefined) {
        continue;
      }
      // if the input value is a string...
      if (typeof inputValue === 'string') {
        // ...and the output property is already a string...
        if (typeof nodeProperties[mapping.outputPropertyKey] === 'string') {
          // ...append the input value to the output value
          nodeProperties[mapping.outputPropertyKey] += ` ${inputValue}`;
        } else {
          // else, if the output property is not a string, set it to the input value
          nodeProperties[mapping.outputPropertyKey] = inputValue;
        }
      } else {
        nodeProperties[mapping.outputPropertyKey] = inputValue;
      }
    }
    return nodeProperties;
  }

  private getVendorInputValue(
    mapping: FieldMapping,
    rawProperties: AbstractFields
  ): VendorFieldType | undefined {
    if (mapping.type === 'constant') {
      let value = mapping.value;
      if (typeof value === 'string') {
        value = value.replace(/\$date/g, new Date().toISOString());
      }
      return value;
    }
    if (mapping.type === 'property') {
      return rawProperties[mapping.inputPropertyKey];
    }
    return undefined;
  }

  getInputNeighborNodes(): NeighborNode[] {
    return this.model.inputNeighborNodes ?? [];
  }

  hasNeighborPropertyMapping(): boolean {
    return this.model.searchQueryFieldMapping.some((m) => m.type === 'neighborProperty');
  }

  getSearchQuery(
    inputNode: LkNode,
    neighborGroups: NeighborGroup[] = []
  ): Record<string, VendorFieldType> {
    const query: Record<string, VendorFieldType> = {};
    for (const mapping of this.model.searchQueryFieldMapping) {
      const inputValue = this.getNodeInputValue(mapping, inputNode, neighborGroups);
      if (inputValue === undefined) {
        continue;
      }
      const expectedType = this.vendor.searchQueryFields.find(
        (f) => f.key === mapping.outputPropertyKey
      )?.type;
      if (expectedType === undefined) {
        console.warn(
          `Search query builder: unknown vendor field ${mapping.outputPropertyKey} (integration: ${this.model.id})`
        );
        continue;
      }
      if (expectedType === 'string') {
        if (query[mapping.outputPropertyKey] === undefined) {
          // first value
          query[mapping.outputPropertyKey] = `${inputValue}`;
        } else {
          // append to existing value
          query[mapping.outputPropertyKey] += ` ${inputValue}`;
        }
      } else if (expectedType === 'number' && typeof inputValue === 'number') {
        query[mapping.outputPropertyKey] = inputValue;
      } else if (expectedType === 'boolean' && typeof inputValue === 'boolean') {
        query[mapping.outputPropertyKey] = inputValue;
      } else {
        console.warn(
          `Search query builder: invalid input value type for ${mapping.outputPropertyKey} (node: #${inputNode.id}, integration: ${this.model.id})`
        );
      }
    }

    // todo check missing required params
    this.checkSearchQuery(query);

    return query;
  }

  private getNodeInputValue(
    mapping: FieldMapping,
    inputNode: LkNode,
    neighborGroups: NeighborGroup[]
  ): VendorFieldType | undefined {
    if (mapping.type === 'constant') {
      return mapping.value;
    }
    if (mapping.type === 'property') {
      return this.getNodePropertyValue(inputNode, mapping.inputPropertyKey);
    }
    if (mapping.type === 'neighborProperty') {
      const neighbor = this.getMappingNeighbor(mapping, neighborGroups);
      return neighbor ? this.getNodePropertyValue(neighbor, mapping.inputPropertyKey) : undefined;
    }
    return undefined;
  }

  private getMappingNeighbor(
    mapping: NeighborPropertyFieldMapping,
    neighborGroups: NeighborGroup[]
  ): LkNode | undefined {
    // take the first neighbor node that matches the mapping
    return neighborGroups.find(
      (g) => g.neighborNode.nodeCategory === mapping.inputNodeCategory && g.nodes.length > 0
    )?.nodes[0];
  }

  private getNodePropertyValue(node: LkNode, propertyKey: string): VendorFieldType | undefined {
    const inputValue = node.data.properties[propertyKey];
    if (inputValue === undefined || inputValue === null || inputValue === '') {
      return undefined;
    }
    if (typeof inputValue === 'object') {
      if (
        'status' in inputValue &&
        (inputValue.status === 'missing' ||
          inputValue.status === 'invalid' ||
          inputValue.status === 'conflict')
      ) {
        console.warn(
          `Reading node property: skipping node #${node.id} property ${propertyKey} (status: ${inputValue.status})`
        );
        return undefined;
      } else if (inputValue.type === 'date' || inputValue.type === 'datetime') {
        // return date/datetime as string for now
        return inputValue.value;
      } else {
        return undefined;
      }
    }
    return inputValue;
  }

  getPluginAction(): PluginAction {
    return {
      sourceKey: this.model.sourceKey,
      name: STRINGS.pluginAction.name(this.vendor),
      urlTemplate: `/?action=search&integrationId=${
        this.model.id
      }&sourceKey=${this.model.sourceKey}&nodeId={{node:${JSON.stringify(
        this.model.inputNodeCategory
      )}}}#linkurious-modal`,
      access: '*'
    };
  }

  private checkSearchQuery(searchQuery: Record<string, VendorFieldType>): void {
    for (const field of this.vendor.searchQueryFields) {
      if (field.required && searchQuery[field.key] === undefined) {
        const missingProperties = this.model.searchQueryFieldMapping.flatMap((mapping) =>
          mapping.type === 'property'
            ? [mapping.inputPropertyKey]
            : mapping.type === 'neighborProperty'
              ? [`${mapping.inputNodeCategory}.${mapping.inputPropertyKey}`]
              : []
        );
        throw new Error(
          STRINGS.errors.checkSearchQuery.requiredFieldMissing(
            this.vendor,
            field,
            missingProperties
          )
        );
      }
    }
  }

  public getNeighborEdgeProperties(neighbor: NeighborResult): Required<EdgeParams>['properties'] {
    const properties: Record<string, unknown> = {};

    if (neighbor.edgeKeyProperty && neighbor.properties[neighbor.edgeKeyProperty] !== undefined) {
      properties[neighbor.edgeKeyProperty] = neighbor.properties[neighbor.edgeKeyProperty];
    }

    return properties;
  }

  public getDuplicateConfig(keyProperty?: string): DuplicateConfig {
    if (keyProperty) {
      return {
        duplicateStrategy: DuplicateStrategy.MERGE,
        duplicateDetection: {property: keyProperty}
      };
    }
    return {
      duplicateStrategy: DuplicateStrategy.IMPORT_EVERYTHING
    };
  }

  getOutputTypes(): Pick<VI, 'outputEdgeType' | 'outputNodeCategory'> {
    return this.model;
  }

  getSourceKey(): string {
    return this.model.sourceKey;
  }
}
