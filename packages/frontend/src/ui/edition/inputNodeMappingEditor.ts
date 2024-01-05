import {Vendor} from '../../../../shared/vendor/vendor';
import {ServiceFacade} from '../../serviceFacade';
import {FieldMapping, FieldMappingType} from '../../../../shared/integration/IntegrationModel';
import {addSelect} from '../uiUtils';
import {IntegrationModelChecker} from '../../integration/integrationModelChecker';
import {VendorField} from '../../../../shared/vendor/vendorModel';
import {asError} from '../../../../shared/utils';
import {GraphItemSchema} from '../../../../shared/api/response.ts';
import {STRINGS} from '../../../../shared/strings';

import {AbstractMappingEditor} from './abstractMappingEditor';

interface InputNodeMappingEditorParams {
  vendor: Vendor;
  sourceKey: string;
  inputNodeType: string;
}

export class InputNodeMappingEditor extends AbstractMappingEditor {
  private readonly params: InputNodeMappingEditorParams;
  private inputNodeSchema?: GraphItemSchema;

  constructor(services: ServiceFacade, params: InputNodeMappingEditorParams) {
    super(services, STRINGS.ui.inputMappingEditor.title, STRINGS.ui.inputMappingEditor.description);
    this.params = params;
  }

  private async getInputNodeSchema(): Promise<GraphItemSchema> {
    if (!this.inputNodeSchema) {
      this.inputNodeSchema = await this.services.schema.getNodeTypeSchema(
        this.params.sourceKey,
        this.params.inputNodeType
      );
    }
    return this.inputNodeSchema;
  }

  private getTargetField(): VendorField | undefined {
    return this.params.vendor.searchQueryFields.find(
      (vf) => vf.key === this.newModel.outputPropertyKey
    );
  }

  protected async addCol1Editor(
    col1: HTMLElement,
    sourceNodeSchema: GraphItemSchema,
    getCol3: () => HTMLElement
  ): Promise<void> {
    const vendorFieldOptions = this.params.vendor.searchQueryFields.map((vf) => ({
      key: vf.key,
      value: this.renderVendorField(vf)
    }));
    addSelect(
      col1,
      {label: STRINGS.ui.inputMappingEditor.searchQueryFieldLabel},
      'search-mapping-vendor-field-select',
      vendorFieldOptions,
      (vendorFieldKey) => {
        getCol3().replaceChildren();
        this.newModel.outputPropertyKey = vendorFieldKey;
        this.addFieldInput(getCol3(), sourceNodeSchema);
        // log
        const vendorField = this.params.vendor.searchQueryFields.find(
          (f) => f.key === vendorFieldKey
        );
        console.log('new searchMapping.vendorField: ' + JSON.stringify(vendorField));
      }
    );
  }

  protected async addCol2Editor(
    col2: HTMLElement,
    sourceNodeSchema: GraphItemSchema,
    getCol3: () => HTMLElement
  ): Promise<void> {
    addSelect<FieldMappingType>(
      col2,
      {label: STRINGS.ui.inputMappingEditor.inputTypeLabel},
      'search-mapping-input-type-select',
      [
        {
          key: 'property',
          value: STRINGS.ui.inputMappingEditor.propertyInputType(this.params.inputNodeType)
        },
        {key: 'constant', value: STRINGS.ui.mappingEditor.constant}
      ],
      (fieldMappingType) => {
        console.log('NEW searchMapping.type: ' + fieldMappingType);
        if (this.newModel.type === 'constant') {
          delete this.newModel.valueType;
          delete this.newModel.value;
        }
        if (this.newModel.type === 'property') {
          delete this.newModel.inputPropertyKey;
        }
        this.newModel.type = fieldMappingType;
        getCol3().replaceChildren();
        this.addFieldInput(getCol3(), sourceNodeSchema);
      }
    );
  }

  private addFieldInput(parent: HTMLElement, sourceNodeSchema: GraphItemSchema): void {
    if (this.newModel.type === 'constant') {
      const targetFieldType = this.getTargetField()?.type;
      if (!targetFieldType) {
        return;
      }
      this.newModel.valueType = targetFieldType;
      this.addConstantValueInput(parent, targetFieldType);
    } else if (this.newModel.type === 'property') {
      this.addNodePropertySelect(parent, sourceNodeSchema);
    }
  }

  private addNodePropertySelect(parent: HTMLElement, sourceNodeSchema: GraphItemSchema): void {
    const targetFieldType = this.getTargetField()?.type;
    if (!targetFieldType) {
      return;
    }
    const properties = sourceNodeSchema.properties
      .filter((p) => IntegrationModelChecker.isLegalPropertyToVendorField(p.type, targetFieldType))
      .map((p) => ({
        key: p.propertyKey,
        value: `${sourceNodeSchema.itemType}.${p.propertyKey} (${p.type})`
      }));
    addSelect(
      parent,
      {label: STRINGS.ui.inputMappingEditor.inputPropertyLabel},
      'search-mapping-source-property-select',
      properties,
      (sourceNodePropertyKey) => {
        console.log('newMapping.sourceProperty: ' + sourceNodePropertyKey);
        if (this.newModel.type === 'property') {
          this.newModel.inputPropertyKey = sourceNodePropertyKey;
        }
      }
    );
  }

  protected renderMappingEntry(
    mapping: FieldMapping,
    nodeTypeSchema: GraphItemSchema
  ): [string, string, string] {
    const vendorField = this.params.vendor.searchQueryFields.find(
      (vf) => vf.key === mapping.outputPropertyKey
    );
    const col1Text = this.renderVendorField(vendorField);

    const col2Text = mapping.type;

    const col3Text =
      mapping.type === 'constant'
        ? JSON.stringify(mapping.value)
        : mapping.type === 'property'
          ? this.renderNodeProperty(mapping.inputPropertyKey, nodeTypeSchema)
          : '(n/a)';
    return [col1Text, col2Text, col3Text];
  }

  protected override async getValidationError(): Promise<string | undefined> {
    const mappings = this.getModel();
    const sourceNodeSchema = await this.getInputNodeSchema();
    try {
      IntegrationModelChecker.checkSourceNodeMappings(
        mappings,
        sourceNodeSchema,
        this.params.vendor
      );
    } catch (e) {
      return asError(e).message;
    }
    return undefined;
  }

  private renderVendorField(vendorField?: VendorField): string {
    return vendorField
      ? `${vendorField?.key}${vendorField.required ? '*' : ''} (${vendorField?.type})`
      : '';
  }

  protected $getNodeTypeSchemaInternal(): Promise<GraphItemSchema> {
    return this.services.schema.getNodeTypeSchema(this.params.sourceKey, this.params.inputNodeType);
  }

  protected assertNewModelIsValid(
    model: Partial<FieldMapping>,
    nodeTypeSchema: GraphItemSchema
  ): asserts model is FieldMapping {
    IntegrationModelChecker.checkSourceNodeMapping(model, this.params.vendor, nodeTypeSchema);
  }
}
