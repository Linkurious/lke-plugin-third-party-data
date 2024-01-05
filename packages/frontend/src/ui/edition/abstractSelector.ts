import {addCombo} from '../uiUtils';
import {UiFacade} from '../uiFacade';

import {AbstractFormPopin} from './abstractFormPopin';

export abstract class AbstractSelector<T> extends AbstractFormPopin<T> {
  private choices?: T[];
  private readonly autocomplete: boolean;
  protected constructor(ui: UiFacade, title: string, description: string, autocomplete = false) {
    super(ui, title, description);
    this.autocomplete = autocomplete;
  }

  private async getChoicesInternal(): Promise<T[]> {
    if (!this.choices) {
      this.choices = await this.getChoices();
    }
    return this.choices;
  }

  protected abstract getChoices(): Promise<T[]>;
  protected abstract getChoiceKey(optionValue: T): string;
  protected abstract getChoiceName(optionValue: T): string;

  public async resolveKey(key?: string): Promise<T | undefined> {
    if (!key) {
      return undefined;
    }
    const choices = await this.getChoicesInternal();
    return choices.find((v) => this.getChoiceKey(v) === key);
  }

  protected async addContent(content: HTMLElement): Promise<void> {
    const choices = await this.getChoicesInternal();
    const choiceValues = choices.map((v) => ({
      key: this.getChoiceKey(v),
      value: this.getChoiceName(v)
    }));
    const model = this.getModel();
    const options = {
      selectedKey: model ? this.getChoiceKey(model) : undefined,
      autocomplete: this.autocomplete
    };
    addCombo(content, options, 'select-popin', choiceValues, (choiceKey) => {
      const model = this.getModel();
      const changed = model === undefined ? true : this.getChoiceKey(model) !== choiceKey;
      if (!changed) {
        return;
      }

      const selectedChoice = choices.find((choice) => this.getChoiceKey(choice) === choiceKey);
      if (!selectedChoice) {
        if (this.autocomplete) {
          // add a new choice (type-wise, this is wrong)
          this.setModel(choiceKey as T);
        } else {
          console.warn('could not find selected choice for key ' + choiceKey);
        }
      } else {
        this.setModel(selectedChoice);
        void this.redrawContent();
      }
    });
  }
}
