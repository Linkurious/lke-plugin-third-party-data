import {Vendor} from '../../../../shared/vendor/vendor';
import {ServiceFacade} from '../../serviceFacade';
import {
  FieldMapping,
  FieldMappingType,
  NeighborNode
} from '../../../../shared/integration/IntegrationModel';
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
  neighborNodes: NeighborNode[];
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
    const inputTypeChoices: {key: FieldMappingType; value: string}[] = [
      {
        key: 'property',
        value: STRINGS.ui.inputMappingEditor.propertyInputType(this.params.inputNodeType)
      },
      {key: 'constant', value: STRINGS.ui.mappingEditor.constant}
    ];
    if (this.params.neighborNodes.length > 0) {
      inputTypeChoices.push({
        key: 'neighborProperty',
        value: STRINGS.ui.inputMappingEditor.neighborProperty
      });
    }
    addSelect<FieldMappingType>(
      col2,
      {label: STRINGS.ui.inputMappingEditor.inputTypeLabel},
      'search-mapping-input-type-select',
      inputTypeChoices,
      (fieldMappingType) => {
        console.log('NEW searchMapping.type: ' + fieldMappingType);
        if (this.newModel.type === 'constant') {
          delete this.newModel.valueType;
          delete this.newModel.value;
        }
        if (this.newModel.type === 'property') {
          delete this.newModel.inputPropertyKey;
        }
        if (this.newModel.type === 'neighborProperty') {
          delete this.newModel.inputPropertyKey;
          delete this.newModel.inputNodeCategory;
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
    } else if (this.newModel.type === 'neighborProperty') {
      this.addNeighborNodeCategorySelect(parent);
    }
  }

  private addNodePropertySelect(parent: HTMLElement, sourceNodeSchema: GraphItemSchema): void {
    this.addPropertySelect(
      parent,
      sourceNodeSchema,
      'search-mapping-source-property-select',
      STRINGS.ui.inputMappingEditor.inputPropertyLabel,
      (sourceNodePropertyKey) => {
        console.log('newMapping.sourceProperty: ' + sourceNodePropertyKey);
        if (this.newModel.type === 'property') {
          this.newModel.inputPropertyKey = sourceNodePropertyKey;
        }
      }
    );
  }

  private addNeighborNodeCategorySelect(parent: HTMLElement): void {
    const categories = Array.from(new Set(this.params.neighborNodes.map((n) => n.nodeCategory)));

    const propertyContainer = document.createElement('div');
    propertyContainer.classList.add('mt-2');

    addSelect(
      parent,
      {label: STRINGS.ui.inputMappingEditor.neighborNodeCategoryLabel},
      'search-mapping-neighbor-category-select',
      categories.map((category) => ({key: category, value: category})),
      (neighborNodeCategory) => {
        propertyContainer.replaceChildren();
        if (this.newModel.type === 'neighborProperty') {
          this.newModel.inputNodeCategory = neighborNodeCategory;
          delete this.newModel.inputPropertyKey;
        }
        void this.addNeighborNodePropertySelect(propertyContainer, neighborNodeCategory);
      }
    );

    parent.appendChild(propertyContainer);
  }

  private async addNeighborNodePropertySelect(
    parent: HTMLElement,
    neighborNodeCategory: string
  ): Promise<void> {
    const neighborNodeSchema = await this.getNeighborNodeSchema(neighborNodeCategory);
    this.addPropertySelect(
      parent,
      neighborNodeSchema,
      'search-mapping-neighbor-property-select',
      STRINGS.ui.inputMappingEditor.neighborPropertyLabel,
      (neighborPropertyKey) => {
        console.log('newMapping.neighborProperty: ' + neighborPropertyKey);
        if (this.newModel.type === 'neighborProperty') {
          this.newModel.inputPropertyKey = neighborPropertyKey;
        }
      }
    );
  }

  private addPropertySelect(
    parent: HTMLElement,
    nodeSchema: GraphItemSchema,
    selectId: string,
    label: string,
    onSelect: (propertyKey: string) => void
  ): void {
    const targetFieldType = this.getTargetField()?.type;
    if (!targetFieldType) {
      return;
    }
    const properties = nodeSchema.properties
      .filter((p) => IntegrationModelChecker.isLegalPropertyToVendorField(p.type, targetFieldType))
      .map((p) => ({
        key: p.propertyKey,
        value: `${nodeSchema.itemType}.${p.propertyKey} (${p.type})`
      }));
    addSelect(parent, {label: label}, selectId, properties, onSelect);
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
          : mapping.type === 'neighborProperty'
            ? this.renderNeighborProperty(mapping.inputNodeCategory, mapping.inputPropertyKey)
            : '(n/a)';
    return [col1Text, col2Text, col3Text];
  }

  protected override async getValidationError(): Promise<string | undefined> {
    const mappings = this.getModel();
    const sourceNodeSchema = await this.getInputNodeSchema();

    // load every node schema for neighbor nodes into the cache before validation
    await this.getAllNeighborNodeSchemas(mappings);

    try {
      IntegrationModelChecker.checkInputNodeMappings(
        mappings,
        sourceNodeSchema,
        this.params.vendor,
        this.getNeighborNodeSchemaFromMapping.bind(this)
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

  private async getAllNeighborNodeSchemas(
    mappings: FieldMapping[] | undefined
  ): Promise<GraphItemSchema[]> {
    const neighborNodeCategories = new Set(
      (mappings ?? [])
        .filter(
          (m): m is FieldMapping & {type: 'neighborProperty'} => m.type === 'neighborProperty'
        )
        .map((m) => m.inputNodeCategory)
    );
    return Promise.all(
      Array.from(neighborNodeCategories).map((category) => this.getNeighborNodeSchema(category))
    );
  }

  private getNeighborNodeSchemaFromMapping(
    mapping: Partial<FieldMapping>
  ): GraphItemSchema | undefined {
    return mapping.type === 'neighborProperty' && mapping.inputNodeCategory
      ? this.neighborNodeSchemasByCategory.get(mapping.inputNodeCategory)
      : undefined;
  }

  protected $getNodeTypeSchemaInternal(nodeType?: string): Promise<GraphItemSchema> {
    return this.services.schema.getNodeTypeSchema(
      this.params.sourceKey,
      nodeType ?? this.params.inputNodeType
    );
  }

  protected assertNewModelIsValid(
    model: Partial<FieldMapping>,
    nodeTypeSchema: GraphItemSchema
  ): asserts model is FieldMapping {
    IntegrationModelChecker.checkInputNodeMapping(
      model,
      this.params.vendor,
      nodeTypeSchema,
      this.getNeighborNodeSchemaFromMapping(model)
    );
  }
}
