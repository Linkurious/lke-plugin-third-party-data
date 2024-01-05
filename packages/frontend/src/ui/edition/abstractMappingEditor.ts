import {ConstantFieldTypeName, FieldMapping} from '../../../../shared/integration/IntegrationModel';
import {ServiceFacade} from '../../serviceFacade';
import {asError} from '../../../../shared/utils';
import {GraphItemSchema} from '../../../../shared/api/response.ts';
import {STRINGS} from '../../../../shared/strings';

import {AbstractFormPopin} from './abstractFormPopin';

export abstract class AbstractMappingEditor extends AbstractFormPopin<FieldMapping[]> {
  protected newModel: Partial<FieldMapping>;
  private nodeTypeSchema?: GraphItemSchema;
  protected readonly services: ServiceFacade;

  protected constructor(services: ServiceFacade, title: string, description: string) {
    super(services.ui, title, description);
    this.services = services;
    this.newModel = {};
    this.setModel([]);
  }

  protected addConstantValueInput(parent: HTMLElement, constantType: ConstantFieldTypeName): void {
    // input
    const constantValueInput = document.createElement('input');
    constantValueInput.classList.add(constantType === 'boolean' ? 'form-check' : 'form-control');
    constantValueInput.id = 'abs-mapping-constant-value-input';
    constantValueInput.type =
      constantType === 'string' ? 'text' : constantType === 'number' ? 'number' : 'checkbox';
    constantValueInput.addEventListener('change', () => {
      if (this.newModel.type === 'constant') {
        this.newModel.value =
          constantType === 'boolean'
            ? constantValueInput.checked
            : constantType === 'number'
              ? Number(constantValueInput.value)
              : constantValueInput.value;
      }
    });
    if (this.newModel.type === 'constant') {
      // initialize the constant value
      this.newModel.value = constantType === 'boolean' ? false : undefined;
    }
    // label
    const constantValueLabel = document.createElement('label');
    constantValueLabel.setAttribute('for', constantValueInput.id);
    constantValueLabel.classList.add('form-label');
    constantValueLabel.textContent = STRINGS.ui.mappingEditor.constant;
    // add label, then input
    parent.appendChild(constantValueLabel);
    parent.appendChild(constantValueInput);
  }

  protected async addContent(content: HTMLElement): Promise<void> {
    const nodeTypeSchema = await this.getNodeTypeSchema();
    const addMapping = document.createElement('div');
    addMapping.classList.add('mb-3', 'row');

    // column 1 (4)
    const col1 = document.createElement('div');
    col1.classList.add('col-4');
    await this.addCol1Editor(col1, nodeTypeSchema, () => col3);
    addMapping.appendChild(col1);

    // column 2 (3)
    const col2 = document.createElement('div');
    col2.classList.add('col-3');
    await this.addCol2Editor(col2, nodeTypeSchema, () => col3);
    addMapping.appendChild(col2);

    // column 3 (4)
    const col3 = document.createElement('div');
    col3.classList.add('col-4');
    addMapping.appendChild(col3);

    // add button (1)
    const col4 = document.createElement('div');
    col4.classList.add('col-1');
    const label = document.createElement('label');
    label.classList.add('form-label', 'd-block');
    label.textContent = STRINGS.ui.mappingEditor.actionColumnHead;
    col4.appendChild(label);
    col4.appendChild(
      this.ui.button.create('Add', {primary: true, small: true}, async () => {
        try {
          this.assertNewModelIsValid(this.newModel, nodeTypeSchema);
          console.log('NEW Mapping: ' + JSON.stringify(this.newModel));
          this.getModel()!.push(this.newModel);
          this.newModel = {};
          this.setValidationError(undefined);
          await this.redrawContent();
        } catch (e) {
          this.setValidationError(asError(e).message);
        }
      })
    );
    addMapping.appendChild(col4);

    content.appendChild(addMapping);

    const allMappings = document.createElement('div');
    for (const mapping of this.getModel()!) {
      allMappings.appendChild(this.createMapping(mapping, nodeTypeSchema));
    }
    content.appendChild(allMappings);
  }

  protected createMapping(mapping: FieldMapping, nodeTypeSchema: GraphItemSchema): HTMLElement {
    const [col1Text, col2Text, col3Text] = this.renderMappingEntry(mapping, nodeTypeSchema);

    const mappingDiv = document.createElement('div');
    mappingDiv.classList.add('mb-3', 'row', 'font-monospace', 'text-break');

    // column 1 (4)
    const col1 = document.createElement('div');
    col1.classList.add('col-4');
    col1.textContent = col1Text;
    mappingDiv.appendChild(col1);

    // column 2 (3)
    const col2 = document.createElement('div');
    col2.classList.add('col-3');
    col2.textContent = col2Text;
    mappingDiv.appendChild(col2);

    // column 3 (4)
    const col3 = document.createElement('div');
    col3.classList.add('col-4');
    col3.textContent = col3Text;
    mappingDiv.appendChild(col3);

    // remove button (1)
    const col4 = document.createElement('div');
    col4.classList.add('col-1');
    col4.appendChild(
      this.ui.button.create('❌', {small: true}, async () => {
        console.log(`Remove Mapping : ` + JSON.stringify(mapping));
        const mappings = this.getModel()!;
        const index = mappings.indexOf(mapping);
        mappings.splice(index, 1);
        mappingDiv.remove();
      })
    );
    mappingDiv.appendChild(col4);

    return mappingDiv;
  }

  protected renderNodeProperty(propertyKey: string, nodeTypeSchema: GraphItemSchema): string {
    const nodeProperty = nodeTypeSchema.properties.find((p) => p.propertyKey === propertyKey);
    return (
      `${nodeTypeSchema.itemType}.${propertyKey}` +
      (nodeProperty ? ` (${nodeProperty.type})` : ' [new]')
    );
  }

  /**
   * Render the 3 columns used to display an existing mapping.
   */
  protected abstract renderMappingEntry(
    mapping: FieldMapping,
    nodeTypeSchema: GraphItemSchema
  ): [string, string, string];

  protected abstract addCol1Editor(
    col1: HTMLElement,
    nodeTypeSchema: GraphItemSchema,
    getCol3: () => HTMLElement
  ): Promise<void>;

  protected abstract addCol2Editor(
    col2: HTMLElement,
    nodeTypeSchema: GraphItemSchema,
    getCol3: () => HTMLElement
  ): Promise<void>;

  protected abstract assertNewModelIsValid(
    model: Partial<FieldMapping>,
    nodeTypeSchema: GraphItemSchema
  ): asserts model is FieldMapping;

  protected abstract $getNodeTypeSchemaInternal(): Promise<GraphItemSchema>;

  protected async getNodeTypeSchema(): Promise<GraphItemSchema> {
    if (!this.nodeTypeSchema) {
      this.nodeTypeSchema = await this.$getNodeTypeSchemaInternal();
    }
    return this.nodeTypeSchema;
  }
}
