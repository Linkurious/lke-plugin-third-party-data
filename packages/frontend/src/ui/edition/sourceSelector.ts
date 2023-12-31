import {ServiceFacade} from '../../serviceFacade';

import {AbstractSelector} from './abstractSelector';

export class SourceSelector extends AbstractSelector<{key: string; name: string}> {
  private readonly services: ServiceFacade;
  constructor(services: ServiceFacade) {
    super(services.ui, 'Select a data-source', 'Select a data-source for this integration');
    this.services = services;
  }

  protected getChoices(): Promise<{key: string; name: string}[]> {
    return this.services.api.getDataSources();
  }

  protected getChoiceKey(optionValue: {key: string; name: string}): string {
    return optionValue.key;
  }

  protected getChoiceName(optionValue: {key: string; name: string}): string {
    return optionValue.name;
  }
}
