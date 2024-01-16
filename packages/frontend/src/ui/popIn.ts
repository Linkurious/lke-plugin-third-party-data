import {STRINGS} from '../../../shared/strings';

import {$id} from './uiUtils';
import {BaseUI} from './baseUI';
import {UiFacade} from './uiFacade';

interface IPopinCloseValue<V = undefined> {
  closedByUser: boolean;
  value: V | undefined;
}

interface PopinCloser<V = undefined> {
  resolve: (output: IPopinCloseValue<V>) => void;
  reject: (reason?: never) => void;
}

export class PopIn extends BaseUI {
  private closer: PopinCloser<unknown> | undefined = undefined;

  constructor(uiFacade: UiFacade) {
    super(uiFacade);
    this.init();
  }

  private init(): void {
    $id('backdrop')!.style.display = 'none';
    document
      .querySelectorAll('#popin .close')
      .forEach((closeButton) => closeButton.addEventListener('click', () => this.close()));
  }

  private get popin(): HTMLElement {
    return $id('popin')!;
  }

  private get body(): HTMLElement {
    return document.querySelector('body')!;
  }

  show(style: 'info' | 'error', message: string, hideApp = false): Promise<IPopinCloseValue> {
    const title = style === 'info' ? STRINGS.ui.popin.info : STRINGS.ui.popin.error;
    const content = document.createElement('span');
    if (style === 'error') {
      content.classList.add('text-danger');
    }
    for (const line of message.split('\n')) {
      const p = document.createElement('p');
      p.textContent = line;
      content.appendChild(p);
    }
    const footer = this.ui.button.create(STRINGS.ui.global.closeButton, {}, () => this.close());
    return this.showElement(title, content, [footer], hideApp);
  }

  /**
   * Resolves to true is the pop-in was closed by the user
   */
  showElement<V = undefined>(
    title: string,
    content: HTMLElement,
    footer: HTMLElement[],
    hideApp = false
  ): Promise<IPopinCloseValue<V>> {
    return new Promise<IPopinCloseValue<V>>((resolve, reject) => {
      if (this.closer) {
        this.closer.resolve({closedByUser: false, value: undefined});
      }
      this.closer = {
        resolve: resolve as (output: IPopinCloseValue<unknown>) => void,
        reject: reject
      };
      const popin = this.popin;
      const close = popin.querySelector('.close')!;
      const titleElement = popin.querySelector('.popinTitle')!;
      const messageElement = popin.querySelector('.popinMessage')!;
      const footerElement = popin.querySelector('.popinFooter')!;

      titleElement.textContent = title;
      messageElement.replaceChildren(content);
      footerElement.replaceChildren(...footer);

      if (hideApp) {
        close.classList.add('none');
        popin.classList.add('hider');
      } else {
        close.classList.remove('none');
        popin.classList.remove('hider');
      }

      popin.style.display = 'block';
      popin.classList.add('show');
      this.body.classList.add('modal-open');
      this.body.style.overflow = 'hidden';
      $id('backdrop')!.style.display = 'block';
      $id('backdrop')!.classList.add('show');
    });
  }

  close(): void {
    this.popin.style.display = 'none';
    this.popin.classList.remove('show');
    this.body.classList.remove('modal-open');
    this.body.style.overflow = '';
    $id('backdrop')!.style.display = 'none';
    $id('backdrop')!.classList.remove('show');

    if (this.closer) {
      this.closer.resolve({closedByUser: true, value: undefined});
      this.closer = undefined;
    }
  }
}
