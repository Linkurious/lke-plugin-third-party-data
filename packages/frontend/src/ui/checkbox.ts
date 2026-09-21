import {asError} from '../../../shared/utils.ts';

import {BaseUI} from './baseUI.ts';
import {UiFacade} from './uiFacade.ts';

export class Checkbox extends BaseUI {
  constructor(ui: UiFacade) {
    super(ui);
  }

  create(
    label: string,
    options: {hideLabel?: boolean},
    handler: (checked: boolean) => void | Promise<void>
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.classList.add('form-check');
    const checkbox = document.createElement('input');
    checkbox.setAttribute('type', 'checkbox');
    checkbox.classList.add('form-check-input');
    wrapper.appendChild(checkbox);
    if (options.hideLabel) {
      checkbox.setAttribute('aria-label', label);
    } else {
      const labelElem = document.createElement('label');
      labelElem.textContent = label;
      labelElem.classList.add('form-check-label');
      wrapper.appendChild(labelElem);
    }
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    checkbox.addEventListener('change', async () => {
      try {
        await handler(checkbox.checked);
      } catch (e) {
        void this.ui.popIn.show('error', asError(e).message);
      }
    });
    return wrapper;
  }
}
