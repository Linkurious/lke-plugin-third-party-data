import {EntityType} from '@linkurious/rest-client';

import {ServiceFacade} from '../../serviceFacade';
import {ItemAccess} from '../../api/schema';
import {NeighborNode} from '../../../../shared/integration/IntegrationModel';
import {STRINGS} from '../../../../shared/strings';
import {addSelect, $elem} from '../uiUtils';

import {AbstractSelector} from './abstractSelector';

export class NodeTypeSelector extends AbstractSelector<string> {
  private readonly services: ServiceFacade;
  private readonly sourceKey: string;
  private readonly access: ItemAccess;

  // undefined = neighbor-nodes section disabled; array (possibly empty) = enabled
  private neighborNodes: NeighborNode[] | undefined;
  private edgeTypeChoices?: string[];
  private nodeTypeChoices?: string[];

  constructor(
    services: ServiceFacade,
    sourceKey: string,
    access: ItemAccess,
    title: string,
    description: string,
    autocomplete: boolean,
    initialNeighborNodes?: NeighborNode[]
  ) {
    super(services.ui, title, description, autocomplete);
    this.services = services;
    this.sourceKey = sourceKey;
    this.access = access;
    this.neighborNodes = initialNeighborNodes ? [...initialNeighborNodes] : undefined;
  }

  protected getChoices(): Promise<string[]> {
    return this.getNodeTypeChoices();
  }

  protected getChoiceKey(optionValue: string): string {
    return optionValue;
  }

  protected getChoiceName(optionValue: string): string {
    return optionValue;
  }

  public getNeighborNodes(): NeighborNode[] {
    return this.neighborNodes ?? [];
  }

  protected override async addContent(content: HTMLElement): Promise<void> {
    const neighborNodesSection = await this.addNeighborNodesSection();
    await super.addContent(content);

    if (neighborNodesSection) {
      content.appendChild(neighborNodesSection);
    }
  }

  private async addNeighborNodesSection(): Promise<HTMLElement | undefined> {
    if (this.neighborNodes === undefined) {
      return;
    }

    const neighborNodes = this.neighborNodes;
    const [edgeTypeChoices, nodeTypeChoices] = await Promise.all([
      this.getEdgeTypeChoices(),
      this.getNodeTypeChoices()
    ]);
    let currentEdgeType: string | undefined;
    let currentNodeCategory: string | undefined;

    const container = $elem('div', {}, [
      $elem('p', {class: 'mt-3'}, STRINGS.ui.inputNeighborNodesEditor.description)
    ]);

    const addRow = $elem('div', {class: 'mb-3 row'});

    // column 1 (5)
    const col1 = $elem('div', {class: 'col-5'});
    addSelect(
      col1,
      {label: STRINGS.ui.inputNeighborNodesEditor.edgeTypeLabel},
      'input-neighbor-node-edge-type-select',
      [
        {key: '', value: STRINGS.ui.inputNeighborNodesEditor.anyEdgeLabel},
        ...edgeTypeChoices.map((edgeType) => ({key: edgeType, value: edgeType}))
      ],
      (edgeType) => {
        currentEdgeType = edgeType || undefined;
      }
    );
    addRow.appendChild(col1);

    // column 2 (6)
    const col2 = $elem('div', {class: 'col-6'});
    addSelect(
      col2,
      {label: STRINGS.ui.inputNeighborNodesEditor.nodeTypeLabel},
      'input-neighbor-node-node-type-select',
      nodeTypeChoices.map((nodeCategory) => ({key: nodeCategory, value: nodeCategory})),
      (nodeCategory) => {
        currentNodeCategory = nodeCategory;
      }
    );
    addRow.appendChild(col2);

    // add button (1)
    const col3 = $elem('div', {class: 'col-1'}, [
      $elem(
        'label',
        {class: 'form-label d-block'},
        STRINGS.ui.inputNeighborNodesEditor.actionColumnHead
      ),
      this.ui.button.create(
        STRINGS.ui.inputNeighborNodesEditor.addButton,
        {outline: true, small: true},
        async () => {
          if (!currentNodeCategory) {
            return;
          }
          neighborNodes.push({edgeType: currentEdgeType, nodeCategory: currentNodeCategory});
          await this.redrawContent();
        }
      )
    ]);
    addRow.appendChild(col3);

    container.appendChild(addRow);

    const list = document.createElement('div');
    for (const neighborNode of neighborNodes) {
      list.appendChild(this.createNeighborNodeRow(neighborNodes, neighborNode));
    }
    container.appendChild(list);

    return container;
  }

  private createNeighborNodeRow(
    neighborNodes: NeighborNode[],
    neighborNode: NeighborNode
  ): HTMLElement {
    const row = $elem('div', {class: 'mb-2 row font-monospace text-break'}, [
      // column 1 (5)
      $elem(
        'div',
        {class: 'col-5'},
        neighborNode.edgeType ?? STRINGS.ui.inputNeighborNodesEditor.anyEdgeLabel
      ),
      // column 2 (6)
      $elem('div', {class: 'col-6'}, neighborNode.nodeCategory),
      // remove button (1)
      $elem('div', {class: 'col-1'}, [
        this.ui.button.create('❌', {small: true, type: 'danger', outline: true}, async () => {
          const index = neighborNodes.indexOf(neighborNode);
          if (index >= 0) {
            neighborNodes.splice(index, 1);
          }
          row.remove();
        })
      ])
    ]);

    return row;
  }

  private async getEdgeTypeChoices(): Promise<string[]> {
    if (!this.edgeTypeChoices) {
      this.edgeTypeChoices = await this.services.schema.getItemTypeNames(
        this.sourceKey,
        EntityType.EDGE,
        this.access
      );
    }
    return this.edgeTypeChoices;
  }

  private async getNodeTypeChoices(): Promise<string[]> {
    if (!this.nodeTypeChoices) {
      this.nodeTypeChoices = await this.services.schema.getItemTypeNames(
        this.sourceKey,
        EntityType.NODE,
        this.access
      );
    }
    return this.nodeTypeChoices;
  }
}
