import {VendorModel} from '../../../shared/vendor/vendor.ts';
import {ServiceFacade} from '../serviceFacade.ts';
import {FieldMapping, FieldMappingType} from '../../../shared/integration/IntegrationModel.ts';
import {addSelect, asError} from '../utils.ts';
import {GraphItemSchema} from '../api/schema.ts';
import {IntegrationModelChecker} from '../integration/integrationModelChecker.ts';
import {VendorField} from '../../../shared/vendor/vendorModel.ts';

import {AbstractMappingEditor} from './abstractMappingEditor.ts';

interface SearchMappingParams {
  vendor: VendorModel;
  sourceKey: string;
  sourceNodeType: string;
}

export class SearchMappingEditor extends AbstractMappingEditor {
  private readonly params: SearchMappingParams;
  private sourceNodeSchema?: GraphItemSchema;

  constructor(services: ServiceFacade, params: SearchMappingParams) {
    super(
      services,
      'Search query mapping',
      'Build the search query from the input node properties'
    );
    this.params = params;
  }

  private async getSourceNodeSchema(): Promise<GraphItemSchema> {
    if (!this.sourceNodeSchema) {
      this.sourceNodeSchema = await this.services.schema.getNodeTypeSchema(
        this.params.sourceKey,
        this.params.sourceNodeType
      );
    }
    return this.sourceNodeSchema;
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
      {label: 'Search query field (* = required)'},
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
      {label: 'Input type'},
      'search-mapping-input-type-select',
      [
        {key: 'property', value: `"${this.params.sourceNodeType}" property`},
        {key: 'constant', value: 'Fixed value'}
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
      {label: 'Source property'},
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
    const sourceNodeSchema = await this.getSourceNodeSchema();
    try {
      IntegrationModelChecker.checkSourceNodeToSearchQueryMapping(
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
    return this.services.schema.getNodeTypeSchema(
      this.params.sourceKey,
      this.params.sourceNodeType
    );
  }

  protected assertNewModelIsValid(
    model: Partial<FieldMapping>,
    nodeTypeSchema: GraphItemSchema
  ): asserts model is FieldMapping {
    IntegrationModelChecker.isSearchMapping(model, this.params.vendor, nodeTypeSchema);
  }
}
