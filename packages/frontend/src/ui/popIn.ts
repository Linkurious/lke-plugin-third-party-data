import {$elem, $id} from './uiUtils';
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
    document
      .querySelectorAll('.popin a.close')
      .forEach((closeButton) => closeButton.addEventListener('click', () => this.close()));
  }

  private get popin(): Element {
    return $id('popin')!;
  }

  show(style: 'info' | 'error', message: string, hideApp = false): Promise<IPopinCloseValue> {
    const title = style === 'info' ? 'Information' : 'Error';
    const content = document.createElement('span');
    if (style === 'error') {
      content.classList.add('text-danger');
    }
    for (const line of message.split('\n')) {
      const p = document.createElement('p');
      p.textContent = line;
      content.appendChild(p);
    }
    content.appendChild(
      $elem('div', {class: 'd-flex justify-content-end'}, [
        this.ui.button.create('Close', {primary: true}, () => this.close())
      ])
    );

    return this.showElement(title, content, hideApp);
  }

  /**
   * Resolves to true is the pop-in was closed by the user
   */
  showElement<V = undefined>(
    title: string,
    content: HTMLElement,
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

      titleElement.textContent = title;
      messageElement.replaceChildren();
      messageElement.appendChild(content);

      if (hideApp) {
        close.classList.add('none');
        popin.classList.add('hider');
      } else {
        close.classList.remove('none');
        popin.classList.remove('hider');
      }

      popin.classList.add('show');
    });
  }

  close(): void {
    this.popin.classList.remove('show');
    if (this.closer) {
      this.closer.resolve({closedByUser: true, value: undefined});
      this.closer = undefined;
    }
  }
}
