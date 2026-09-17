import {asError} from '../../../shared/utils.ts';

import {BaseUI} from './baseUI.ts';
import {UiFacade} from './uiFacade.ts';

export class Checkbox extends BaseUI {
  constructor(ui: UiFacade) {
    super(ui);
  }

  create(handler: (checked: boolean) => void | Promise<void>): HTMLInputElement {
    const checkbox = document.createElement('input');
    checkbox.setAttribute('type', 'checkbox');
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    checkbox.addEventListener('change', async () => {
      try {
        await handler(checkbox.checked);
      } catch (e) {
        void this.ui.popIn.show('error', asError(e).message);
      }
    });
    return checkbox;
  }
}
