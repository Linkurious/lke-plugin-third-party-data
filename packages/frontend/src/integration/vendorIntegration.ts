import {ICreateNodeParams, ICreateEdgeParams} from '@linkurious/rest-client';

import {ServiceFacade} from '../serviceFacade.ts';
import {IntegrationModelPublic} from '../../../shared/integration/IntegrationModel.ts';
import {VendorSearchResult} from '../../../shared/api/response.ts';

export class VendorIntegration {
  private readonly model: IntegrationModelPublic;
  //private readonly services: ServiceFacade;

  constructor(_services: ServiceFacade, model: IntegrationModelPublic) {
    //this.services = services;
    this.model = model;
  }

  /*
  async check(): Promise<void> {
    const vendor = this.services.vendor.getVendorByKey(this.model.vendorKey);
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
      switch (mapping.type) {
        case 'property':
          node.properties[mapping.outputPropertyKey] =
            searchResult.properties[mapping.inputPropertyKey];
          break;
        case 'constant':
          node.properties[mapping.outputPropertyKey] = mapping.value;
          break;
      }
    }
    return node;
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
}
