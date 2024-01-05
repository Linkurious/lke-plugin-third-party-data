import {ItemTypeAccessRightType, PropertyTypeName} from '@linkurious/rest-client';

import {ServiceFacade} from '../../serviceFacade';
import {FieldMapping, FieldMappingType} from '../../../../shared/integration/IntegrationModel';
import {$elem, addCombo, addSelect} from '../uiUtils';
import {IntegrationModelChecker} from '../../integration/integrationModelChecker';
import {VendorField, VendorFieldTypeName} from '../../../../shared/vendor/vendorModel';
import {Vendor} from '../../../../shared/vendor/vendor';
import {asError} from '../../../../shared/utils';
import {GraphItemSchema, GraphPropertySchema} from '../../../../shared/api/response.ts';
import {STRINGS} from '../../../../shared/strings';

import {AbstractMappingEditor} from './abstractMappingEditor';

interface OutputNodeMappingEditorParams {
  vendor: Vendor;
  sourceKey: string;
  outputNodeType: string;
}

export class OutputNodeMappingEditor extends AbstractMappingEditor {
  private readonly params: OutputNodeMappingEditorParams;
  private outputNodeSchema?: GraphItemSchema;

  constructor(services: ServiceFacade, params: OutputNodeMappingEditorParams) {
    super(
      services,
      STRINGS.ui.outputMappingEditor.title,
      STRINGS.ui.outputMappingEditor.description
    );
    this.params = params;
  }

  private async getOutputNodeSchema(): Promise<GraphItemSchema> {
    if (!this.outputNodeSchema) {
      this.outputNodeSchema = await this.services.schema.getNodeTypeSchema(
        this.params.sourceKey,
        this.params.outputNodeType,
        ItemTypeAccessRightType.WRITE,
        true
      );
    }
    return this.outputNodeSchema;
  }

  private getTargetProperty(targetNodeSchema: GraphItemSchema): GraphPropertySchema | undefined {
    return targetNodeSchema.properties.find(
      (p) => p.propertyKey === this.newModel.outputPropertyKey
    );
  }

  private addPropertyInput(parent: HTMLElement, targetNodeSchema: GraphItemSchema): void {
    // for properties that do not exist on the node type, create them as "auto"
    const targetPropertyType =
      this.getTargetProperty(targetNodeSchema)?.type ?? PropertyTypeName.AUTO;
    // get the list of legal field types for the target node property type
    const validTypes = IntegrationModelChecker.getLegalValueTypeForProperty(targetPropertyType);
    if (!validTypes.length) {
      return;
    }
    if (this.newModel.type === 'constant') {
      this.newModel.valueType = validTypes[0];
      this.addConstantValueInput(parent, validTypes[0]);
    } else if (this.newModel.type === 'property') {
      this.addDetailsFieldSelect(parent, validTypes);
    }
  }

  private addDetailsFieldSelect(parent: HTMLElement, validTypes: VendorFieldTypeName[]): void {
    const outputFields = this.params.vendor.outputFields
      .filter((vf) => validTypes.includes(vf.type))
      .map((vf) => ({
        key: vf.key,
        value: this.renderVendorField(vf)
      }));
    addSelect(
      parent,
      {label: STRINGS.ui.outputMappingEditor.apiFieldLabel},
      'details-mapping-source-field-select',
      outputFields,
      (sourceFieldKey) => {
        console.log('newDetailsMapping.sourceFieldKey: ' + sourceFieldKey);
        if (this.newModel.type === 'property') {
          this.newModel.inputPropertyKey = sourceFieldKey;
        }
      }
    );
  }

  protected override getExtraFooter(): HTMLElement {
    const textDefault = STRINGS.ui.outputMappingEditor.defaultMappingText;
    const textClear = STRINGS.ui.outputMappingEditor.clearMappingText;
    const btnOptions = {primary: true, small: true, outline: true};
    const buttonDefault = this.ui.button.create(
      STRINGS.ui.outputMappingEditor.defaultMappingButton,
      btnOptions,
      async () => {
        this.setModel(
          this.params.vendor.outputFields.map((vf) => ({
            type: 'property',
            inputPropertyKey: vf.key,
            outputPropertyKey: vf.key
          }))
        );
        await this.redrawContent();
      }
    );
    const buttonClear = this.ui.button.create(
      STRINGS.ui.outputMappingEditor.clearMappingButton,
      btnOptions,
      async () => {
        this.setModel([]);
        await this.redrawContent();
      }
    );
    return $elem('div', {class: 'mb-3'}, [
      $elem('div', {class: 'row mb-1'}, [
        $elem('div', {class: 'col-2'}, [buttonDefault]),
        $elem('div', {class: 'col-10'}, [$elem('label', {}, textDefault)])
      ]),
      $elem('div', {class: 'row'}, [
        $elem('div', {class: 'col-2'}, [buttonClear]),
        $elem('div', {class: 'col-10'}, [$elem('label', {}, textClear)])
      ])
    ]);
  }

  protected renderMappingEntry(
    mapping: FieldMapping,
    nodeSchema: GraphItemSchema
  ): [string, string, string] {
    const col1Text = this.renderNodeProperty(mapping.outputPropertyKey, nodeSchema);
    const col2Text = mapping.type;
    const col3Text =
      mapping.type === 'constant'
        ? JSON.stringify(mapping.value)
        : mapping.type === 'property'
          ? this.renderVendorFieldKey(mapping.inputPropertyKey)
          : '(n/a)';
    return [col1Text, col2Text, col3Text];
  }

  protected override async getValidationError(): Promise<string | undefined> {
    const mappings = this.getModel();
    const targetNodeSchema = await this.getOutputNodeSchema();
    try {
      IntegrationModelChecker.checkDetailsResponseToOutputNodeMapping(
        mappings,
        targetNodeSchema,
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

  private renderVendorFieldKey(vendorFieldKey?: string): string {
    const vendorField = this.params.vendor.outputFields.find((vf) => vf.key === vendorFieldKey);
    return this.renderVendorField(vendorField);
  }

  protected async addCol1Editor(
    col1: HTMLElement,
    targetNodeSchema: GraphItemSchema,
    getCol3: () => HTMLElement
  ): Promise<void> {
    const properties = targetNodeSchema.properties.map((p) => ({
      key: p.propertyKey,
      value: `${targetNodeSchema.itemType}.${p.propertyKey}${p.required ? '*' : ''} (${p.type})`
    }));
    addCombo(
      col1,
      {label: `${targetNodeSchema.itemType} property`, autocomplete: true},
      'details-mapping-node-property-select',
      properties,
      (propertyKey) => {
        getCol3().replaceChildren();
        this.newModel.outputPropertyKey = propertyKey;
        this.addPropertyInput(getCol3(), targetNodeSchema);
        console.log('newDetailsMapping.propertyKey: ' + JSON.stringify(propertyKey));
      }
    );
  }

  protected async addCol2Editor(
    col2: HTMLElement,
    targetNodeSchema: GraphItemSchema,
    getCol3: () => HTMLElement
  ): Promise<void> {
    addSelect<FieldMappingType>(
      col2,
      {label: STRINGS.ui.outputMappingEditor.inputTypeLabel},
      'details-mapping-input-type-select',
      [
        {key: 'property', value: STRINGS.ui.outputMappingEditor.fieldInputLabel},
        {key: 'constant', value: STRINGS.ui.mappingEditor.constant}
      ],
      (fieldMappingType) => {
        console.log('NEW detailsMapping.type: ' + fieldMappingType);
        if (this.newModel.type === 'constant') {
          delete this.newModel.valueType;
          delete this.newModel.value;
        }
        if (this.newModel.type === 'property') {
          delete this.newModel.inputPropertyKey;
        }
        this.newModel.type = fieldMappingType;
        getCol3().replaceChildren();
        this.addPropertyInput(getCol3(), targetNodeSchema);
      }
    );
  }

  protected assertNewModelIsValid(
    model: Partial<FieldMapping>,
    nodeTypeSchema: GraphItemSchema
  ): asserts model is FieldMapping {
    IntegrationModelChecker.isOutputMapping(model, this.params.vendor, nodeTypeSchema);
  }

  protected $getNodeTypeSchemaInternal(): Promise<GraphItemSchema> {
    return this.services.schema.getNodeTypeSchema(
      this.params.sourceKey,
      this.params.outputNodeType,
      ItemTypeAccessRightType.WRITE,
      true
    );
  }
}
