import {UiFacade} from '../uiFacade';
import {STRINGS} from '../../../../shared/strings';

import {AbstractFormPopin} from './abstractFormPopin';

export class ListMultiselector<T extends string = string> extends AbstractFormPopin<T[]> {
  private readonly input: T[];
  private readonly validator: (value: T[]) => string | undefined;
  private readonly renderer: (item: T) => string;
  private list?: HTMLElement;
  constructor(
    ui: UiFacade,
    title: string,
    description: string,
    input: T[],
    renderer: (item: T) => string,
    validator: (value: T[]) => string | undefined
  ) {
    super(ui, title, description);
    this.input = input;
    this.renderer = renderer;
    this.validator = validator;
    this.setModel([]);
  }

  protected async addContent(content: HTMLElement): Promise<void> {
    this.list = document.createElement('div');
    this.list.classList.add('mb-3');
    const model = this.getModel() ?? [];
    for (let i = 0; i < this.input.length; i++) {
      const item = this.input[i];
      const wrapper = document.createElement('div');
      wrapper.classList.add('form-check');
      const checkbox = document.createElement('input');
      checkbox.id = `list-multi-selector-${i}`;
      checkbox.classList.add('form-check-input');
      checkbox.setAttribute('type', 'checkbox');
      if (model.includes(item)) {
        checkbox.setAttribute('checked', 'checked');
      }
      wrapper.appendChild(checkbox);
      const label = document.createElement('label');
      label.classList.add('form-check-label');
      label.textContent = this.renderer(item);
      label.htmlFor = checkbox.id;
      wrapper.appendChild(label);
      this.list.appendChild(wrapper);
    }
    content.appendChild(this.list);
  }

  protected override async getValidationError(): Promise<string | undefined> {
    if (!this.list) {
      return STRINGS.errors.multiSelector.listUndefined;
    }
    const selected = Array.from(this.list.querySelectorAll('input'))
      .map((input, i) => (input.checked ? this.input[i] : undefined))
      .filter((item) => item !== undefined) as T[];
    this.setModel(selected);
    return this.validator(selected);
  }
}
