import {
  ICreateNodeParams,
  ICreateEdgeParams,
  ICreateCustomActionParams,
  SharingMode,
  LkNode
} from '@linkurious/rest-client';

import {VendorResult} from '../api/response';
import {VendorFieldType} from '../vendor/vendorModel';
import {Vendor} from '../vendor/vendor';
import {Vendors} from '../vendor/vendors';
import {STRINGS} from '../strings';

import {FieldMapping, IntegrationModelPublic, PropertyFieldMapping} from './IntegrationModel';

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
  /*
  async check(): Promise<void> {
    const vendor = Vendors.getVendorByKey(this.model.vendorKey);
    const checker = new IntegrationModelChecker(this.model, vendor);
    await checker.check(services);
  }
  */

  getOutputNode(vendorResult: VendorResult): ICreateNodeParams {
    const node = {
      sourceKey: this.model.sourceKey,
      categories: [this.model.outputNodeCategory],
      properties: {} as Record<string, unknown>
    };
    for (const mapping of this.model.outputNodeFieldMapping) {
      const inputValue = this.getVendorInputValue(mapping, vendorResult);
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
          // else, if the output property is not a string, set it to the input value
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
    searchResult: VendorResult
  ): VendorFieldType | undefined {
    if (mapping.type === 'constant') {
      let value = mapping.value;
      if (typeof value === 'string') {
        value = value.replace(/\$date/g, new Date().toISOString());
      }
      return value;
    }
    if (mapping.type === 'property') {
      return searchResult.properties[mapping.inputPropertyKey];
    }
    return undefined;
  }

  getOutputEdge(
    _searchResult: VendorResult,
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
    for (const mapping of this.model.searchQueryFieldMapping) {
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

    // todo check missing required params
    this.checkSearchQuery(query);

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
      name: STRINGS.customAction.name(this.vendor),
      description: STRINGS.customAction.details(this.vendor),
      urlTemplate: `{{baseURL}}plugins/${basePath}/?action=search&integrationId=${
        this.model.id
      }&sourceKey=${this.model.sourceKey}&nodeId={{node:${JSON.stringify(
        this.model.inputNodeCategory
      )}}}`,
      sharing: SharingMode.SOURCE,
      sharedWithGroups: undefined
    };
  }

  private checkSearchQuery(searchQuery: Record<string, VendorFieldType>): void {
    for (const field of this.vendor.searchQueryFields) {
      if (field.required && searchQuery[field.key] === undefined) {
        const missingProperties = this.model.searchQueryFieldMapping
          .filter((m) => m.type === 'property')
          .map((mapping) => (mapping as PropertyFieldMapping).inputPropertyKey);
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
}
