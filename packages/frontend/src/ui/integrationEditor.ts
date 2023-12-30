import {IntegrationModel} from '../../../shared/integration/IntegrationModel.ts';
import {ServiceFacade} from '../serviceFacade.ts';

import {VendorEditorModel, VendorSelector} from './vendorSelector.ts';
import {BaseUI} from './baseUI.ts';
import {NodeTypeSelector} from './nodeTypeSelector.ts';
import {SourceSelector} from './sourceSelector.ts';
import {SearchMappingEditor} from './searchMappingEditor.ts';
import {ListMultiselector} from './listMultiselector.ts';
import {DetailsMappingEditor} from './detailsMappingEditor.ts';

export class IntegrationEditor extends BaseUI {
  private readonly services: ServiceFacade;

  constructor(services: ServiceFacade) {
    super(services.ui);
    this.services = services;
  }

  async show(model: Partial<IntegrationModel>): Promise<IntegrationModel | undefined> {
    // vendor
    const vendorSelector = new VendorSelector(this.services);
    let currentVendorInfo: VendorEditorModel | undefined = undefined;
    if (model.vendorKey) {
      currentVendorInfo = {
        vendor: this.services.vendor.getVendorByKey(model.vendorKey),
        adminSettings: model.adminSettings ?? {}
      };
    }
    const vendorInfo = await vendorSelector.show(currentVendorInfo);
    if (!vendorInfo) {
      return;
    }
    model.vendorKey = vendorInfo.vendor.key;
    model.adminSettings = vendorInfo.adminSettings;
    console.log(
      `integration: selected vendor: ${vendorInfo.vendor.key} - ${JSON.stringify(
        vendorInfo.adminSettings
      )}`
    );

    // data-source
    const sourceSelector = new SourceSelector(this.services);
    const dataSource = await sourceSelector.show(await sourceSelector.resolveKey(model.sourceKey));
    if (!dataSource) {
      return;
    }
    model.sourceKey = dataSource.key;
    console.log('integration: selected source key: ' + JSON.stringify(dataSource));

    // source node-category
    const sourceNodeCategorySelector = new NodeTypeSelector(
      this.services,
      model.sourceKey,
      'read',
      'Select the source node-category for this integration'
    );
    const sourceNodeCategory = await sourceNodeCategorySelector.show(model.inputNodeCategory);
    if (!sourceNodeCategory) {
      return;
    }
    model.inputNodeCategory = sourceNodeCategory;
    console.log('integration: selected node category: ' + JSON.stringify(sourceNodeCategory));

    // source-node property mapping
    const searchMappingEditor = new SearchMappingEditor(this.services, {
      sourceKey: model.sourceKey,
      sourceNodeType: model.inputNodeCategory,
      vendor: vendorInfo.vendor
    });
    const searchMapping = await searchMappingEditor.show(model.searchQueryFieldMapping);
    if (!searchMapping) {
      return;
    }
    model.searchQueryFieldMapping = searchMapping;
    console.log('integration: selected search mapping: ' + JSON.stringify(searchMapping));

    // search result display
    const searchResultDisplay = new ListMultiselector(
      this.ui,
      'Search result',
      'Select the response fields to display in the search results',
      vendorInfo.vendor.searchResponseFields.map((vf) => vf.key),
      (vfKey) => {
        const vf = vendorInfo.vendor.searchResponseFields.find((vf) => vf.key === vfKey);
        return vf ? `${vf.key} (${vf.type})` : '[unknown choice]';
      },
      (vfKeys) => {
        if (vfKeys.length === 0) {
          return 'At least one field must be selected';
        }
        return undefined;
      }
    );
    const searchResultsKeys = await searchResultDisplay.show(model.searchResponseFieldSelection);
    if (!searchResultsKeys) {
      return;
    }
    model.searchResponseFieldSelection = searchResultsKeys;
    console.log('integration: selected search results: ' + JSON.stringify(searchResultsKeys));

    // select target edge-type
    // todo
    model.outputEdgeType = 'has_details';

    // select target node-category
    const targetNodeCategorySelector = new NodeTypeSelector(
      this.services,
      dataSource.key,
      'write',
      'Select the node-category to create from the search result'
    );
    const targetNodeCategory = await targetNodeCategorySelector.show(model.outputNodeCategory);
    if (!targetNodeCategory) {
      return;
    }
    model.outputNodeCategory = targetNodeCategory;

    // TargetNode details mapping
    const detailsMappingEditor = new DetailsMappingEditor(this.services, {
      sourceKey: dataSource.key,
      targetNodeType: model.outputNodeCategory,
      vendor: vendorInfo.vendor
    });
    const detailsMapping = await detailsMappingEditor.show(model.outputNodeFieldMapping);
    if (!detailsMapping) {
      return;
    }
    model.outputNodeFieldMapping = detailsMapping;
    console.log('integration: selected details mapping: ' + JSON.stringify(detailsMapping));

    return model as IntegrationModel;
  }
}
