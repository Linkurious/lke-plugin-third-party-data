import {asError} from '../../../shared/utils';

import {BaseUI} from './baseUI';
import {UiFacade} from './uiFacade';

export class Button extends BaseUI {
  constructor(ui: UiFacade) {
    super(ui);
  }

  create(
    label: string,
    options: {
      type?: 'primary' | 'secondary' | 'danger';
      small?: boolean;
      outline?: boolean;
      classes?: string[];
    },
    handler: () => void | Promise<void>
  ): HTMLButtonElement {
    const button = document.createElement('button');
    const outline = options.outline ? 'outline-' : '';
    button.classList.add('btn', `btn-${outline}${options.type ?? 'primary'}`, 'ms-2');
    if (options.classes) {
      button.classList.add(...options.classes);
    }
    if (options.small) {
      button.classList.add('btn-sm');
    }
    button.textContent = label;
    button.setAttribute('type', 'button');
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    button.addEventListener('click', async () => {
      try {
        await handler();
      } catch (e) {
        void this.ui.popIn.show('error', asError(e).message);
      }
    });
    return button;
  }
}
