import {EntityType} from '@linkurious/rest-client';

import {ServiceFacade} from '../../serviceFacade';
import {ItemAccess} from '../../api/schema';

import {AbstractSelector} from './abstractSelector';

export class NodeTypeSelector extends AbstractSelector<string> {
  private readonly services: ServiceFacade;
  private readonly sourceKey: string;
  private readonly access: ItemAccess;

  constructor(
    services: ServiceFacade,
    sourceKey: string,
    access: ItemAccess,
    title: string,
    description: string,
    autocomplete: boolean
  ) {
    super(services.ui, title, description, autocomplete);
    this.services = services;
    this.sourceKey = sourceKey;
    this.access = access;
  }

  protected getChoices(): Promise<string[]> {
    return this.services.schema.getItemTypeNames(this.sourceKey, EntityType.NODE, this.access);
  }

  protected getChoiceKey(optionValue: string): string {
    return optionValue;
  }

  protected getChoiceName(optionValue: string): string {
    return optionValue;
  }
}
