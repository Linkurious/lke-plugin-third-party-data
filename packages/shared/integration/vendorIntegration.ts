import {
  ICreateNodeParams,
  ICreateEdgeParams,
  ICreateCustomActionParams,
  SharingMode
} from '@linkurious/rest-client';
import {LkNode} from '@linkurious/rest-client/dist/src/api/graphItemTypes';

import {VendorSearchResult} from '../api/response';
import {VendorFieldType} from '../vendor/vendorModel';
import {Vendor} from '../vendor/vendor';

import {FieldMapping, IntegrationModelPublic} from './IntegrationModel';

export class VendorIntegration {
  private readonly model: IntegrationModelPublic;
  public readonly vendor: Vendor;

  constructor(model: IntegrationModelPublic) {
    this.model = model;
    this.vendor = Vendor.getVendorByKey(this.model.vendorKey);
  }

  get id(): string {
    return this.model.id;
  }
  /*
  async check(): Promise<void> {
    const vendor = Vendor.getVendorByKey(this.model.vendorKey);
    const checker = new IntegrationModelChecker(this.model, vendor);
    await checker.check(services);
  }
  */

  getOutputNode(searchResult: VendorSearchResult): ICreateNodeParams {
    const node = {
      sourceKey: this.model.sourceKey,
      categories: [this.model.outputNodeCategory],
      properties: {} as Record<string, unknown>
    };
    for (const mapping of this.model.outputNodeFieldMapping) {
      const inputValue = this.getVendorInputValue(mapping, searchResult);
      if (inputValue === undefined) {
        continue;
      }
      // if the input value is a string...
      if (typeof inputValue === 'string') {
        // ...and the output property is already a string...
        if (typeof node.properties[mapping.outputPropertyKey] === 'string') {
          // ...append the input value to the output value
          node.properties[mapping.outputPropertyKey] += ` ${inputValue}`;
        } else {
          node.properties[mapping.outputPropertyKey] = inputValue;
        }
      } else {
        node.properties[mapping.outputPropertyKey] = inputValue;
      }
    }
    return node;
  }

  private getVendorInputValue(
    mapping: FieldMapping,
    searchResult: VendorSearchResult
  ): VendorFieldType | undefined {
    if (mapping.type === 'constant') {
      return mapping.value;
    }
    if (mapping.type === 'property') {
      return searchResult.properties[mapping.inputPropertyKey];
    }
    return undefined;
  }

  getOutputEdge(
    _searchResult: VendorSearchResult,
    outputNodeId: string,
    inputNodeId: string
  ): ICreateEdgeParams {
    return {
      sourceKey: this.model.sourceKey,
      type: this.model.outputEdgeType,
      properties: {} as Record<string, unknown>,
      // edge direction: from output node to input node
      source: outputNodeId,
      target: inputNodeId
    };
  }

  getSearchQuery(inputNode: LkNode): Record<string, VendorFieldType> {
    const query: Record<string, VendorFieldType> = {};
    for (const mapping of this.model.outputNodeFieldMapping) {
      const inputValue = this.getNodeInputValue(mapping, inputNode);
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
    return query;
  }

  private getNodeInputValue(mapping: FieldMapping, inputNode: LkNode): VendorFieldType | undefined {
    if (mapping.type === 'constant') {
      return mapping.value;
    }
    if (mapping.type === 'property') {
      return this.getNodePropertyValue(inputNode, mapping.inputPropertyKey);
    }
    return undefined;
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
        // console.warn(`Reading node property: unknown property type ${inputValue['type']}`);
        return undefined;
      }
    }
    return inputValue;
  }

  getCustomAction(basePath: string): ICreateCustomActionParams {
    return {
      sourceKey: this.model.sourceKey,
      name: `Fetch details from ${this.vendor.name}`,
      description: `Get details from ${this.vendor.name} (action auto-generated by the third-party data plugin)`,
      urlTemplate: `{{baseURL}}plugins/${basePath}/?action=search&integrationId=${
        this.model.id
      }&sourceKey=${this.model.sourceKey}&itemId={{node:${JSON.stringify(
        this.model.inputNodeCategory
      )}}`,
      sharing: SharingMode.SOURCE,
      sharedWithGroups: undefined
    };
  }
}
