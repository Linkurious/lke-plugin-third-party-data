import {ServiceFacade} from '../../serviceFacade';
import {STRINGS} from '../../../../shared/strings';

import {AbstractSelector} from './abstractSelector';

export class SourceSelector extends AbstractSelector<{key: string; name: string}> {
  private readonly services: ServiceFacade;
  constructor(services: ServiceFacade) {
    super(services.ui, STRINGS.ui.sourceSelector.title, STRINGS.ui.sourceSelector.description);
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
