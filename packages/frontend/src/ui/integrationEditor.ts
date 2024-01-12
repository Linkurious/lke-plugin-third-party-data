import {IntegrationModel} from '../../../shared/integration/IntegrationModel';
import {ServiceFacade} from '../serviceFacade';
import {Vendors} from '../../../shared/vendor/vendors.ts';
import {STRINGS} from '../../../shared/strings';

import {VendorEditorModel, VendorSelector} from './edition/vendorSelector';
import {BaseUI} from './baseUI';
import {NodeTypeSelector} from './edition/nodeTypeSelector';
import {SourceSelector} from './edition/sourceSelector';
import {InputNodeMappingEditor} from './edition/inputNodeMappingEditor';
import {ListMultiselector} from './edition/listMultiselector';
import {OutputNodeMappingEditor} from './edition/outputNodeMappingEditor';

export class IntegrationEditor extends BaseUI {
  private readonly services: ServiceFacade;

  constructor(services: ServiceFacade) {
    super(services.ui);
    this.services = services;
  }

  async show(model: Partial<IntegrationModel>): Promise<IntegrationModel | undefined> {
    // vendor
    const vendorSelector = new VendorSelector(this.ui);
    let currentVendorInfo: VendorEditorModel | undefined = undefined;
    if (model.vendorKey) {
      currentVendorInfo = {
        vendor: Vendors.getVendorByKey(model.vendorKey),
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
    const inputNodeTypeSelector = new NodeTypeSelector(
      this.services,
      model.sourceKey,
      'read',
      STRINGS.ui.integrationEditor.selectInputNodeTypeTitle,
      STRINGS.ui.integrationEditor.selectInputNodeTypeDescription,
      false
    );
    const inputNodeCategory = await inputNodeTypeSelector.show(model.inputNodeCategory);
    if (!inputNodeCategory) {
      return;
    }
    model.inputNodeCategory = inputNodeCategory;
    console.log('integration: selected node category: ' + JSON.stringify(inputNodeCategory));

    // InputNode property mapping
    const inputNodeMappingEditor = new InputNodeMappingEditor(this.services, {
      sourceKey: model.sourceKey,
      inputNodeType: model.inputNodeCategory,
      vendor: vendorInfo.vendor
    });
    const inputMapping = await inputNodeMappingEditor.show(model.searchQueryFieldMapping);
    if (!inputMapping) {
      return;
    }
    model.searchQueryFieldMapping = inputMapping;
    console.log('integration: selected search mapping: ' + JSON.stringify(inputMapping));

    // search result display
    const searchResultDisplay = new ListMultiselector(
      this.ui,
      STRINGS.ui.searchResultFieldSelector.title,
      STRINGS.ui.searchResultFieldSelector.description,
      vendorInfo.vendor.searchResponseFields.map((vf) => vf.key),
      (vfKey) => {
        const vf = vendorInfo.vendor.searchResponseFields.find((vf) => vf.key === vfKey);
        return vf ? `${vf.key} (${vf.type})` : '[unknown choice]';
      },
      (vfKeys) => {
        if (vfKeys.length === 0) {
          return STRINGS.errors.searchResultFieldSelectorEmpty;
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

    // select output edge-type
    // todo
    model.outputEdgeType = 'has_details';

    // select output node-category
    const outputNodeCategorySelector = new NodeTypeSelector(
      this.services,
      dataSource.key,
      'write',
      STRINGS.ui.integrationEditor.selectOutputNodeTypeTitle,
      STRINGS.ui.integrationEditor.selectOutputNodeTypeDescription,
      true
    );
    const outputNodeCategory = await outputNodeCategorySelector.show(model.outputNodeCategory);
    if (!outputNodeCategory) {
      return;
    }
    model.outputNodeCategory = outputNodeCategory;

    // OutputNode details mapping
    const detailsMappingEditor = new OutputNodeMappingEditor(this.services, {
      sourceKey: dataSource.key,
      outputNodeType: model.outputNodeCategory,
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
