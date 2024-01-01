import {$id} from './uiUtils';
import {UiFacade} from './uiFacade';
import {BaseUI} from './baseUI';

export interface RunLongTaskOptions {
  /**
   * Set a non-transparent background to hide the application. Default false.
   */
  hideApp?: boolean;
  /**
   * Show the error in a pop-in and await its closure. Default true.
   */
  defaultErrorHandler?: boolean;
}

export class LongTask extends BaseUI {
  private nestedWaitingTasks: number;

  constructor(uiFacade: UiFacade) {
    super(uiFacade);
    this.nestedWaitingTasks = 0;
  }
  async run<T, V>(
    init: T,
    task: (updater: IWaitingMessage<T>) => Promise<V>,
    options: RunLongTaskOptions = {}
  ): Promise<V> {
    const updater = this.startWaiting(options.hideApp ?? false, init);
    try {
      try {
        return await task(updater);
      } catch (e) {
        if (options.defaultErrorHandler ?? true) {
          await this.ui.popIn.show('error', e instanceof Error ? e.toString() : JSON.stringify(e));
        }
        throw e;
      }
    } finally {
      this.stopWaiting(updater);
    }
  }

  private startWaiting<T>(hideApp: boolean, init: T): WaitingMessage<T> {
    this.nestedWaitingTasks++;

    const spinner = document.getElementById('spinner') as HTMLDivElement;
    if (hideApp) {
      spinner.classList.add('hider');
    }
    spinner.classList.add('show');

    return new WaitingMessage(spinner, this.nestedWaitingTasks, init);
  }

  private stopWaiting<T>(updater: WaitingMessage<T>): void {
    this.nestedWaitingTasks--;
    updater.destroy();
    if (this.nestedWaitingTasks === 0) {
      const spinner = $id('spinner') as HTMLDivElement;
      spinner.classList.remove('hider');
      spinner.classList.remove('show');
    }
  }
}

export interface IWaitingMessage<T> {
  data: T;
  readonly nestLevel: number;
  update(message: string): void;
}

class WaitingMessage<T> implements IWaitingMessage<T> {
  public data: T;
  readonly nestLevel: number;
  private destroyed: boolean;
  private readonly message: HTMLDivElement;

  constructor(container: HTMLDivElement, nestLevel: number, init: T) {
    this.nestLevel = nestLevel;
    this.destroyed = false;
    this.data = init;

    const messageContainer = container.querySelector('.messageDisplay') as HTMLDivElement;
    this.message = document.createElement('p');
    this.message.classList.add('none');
    messageContainer.appendChild(this.message);
  }

  update(message: string): void {
    if (this.destroyed) {
      throw new Error('Task already completed');
    }

    if (message === '' || message === null || message === undefined) {
      this.message.classList.add('none');
    } else {
      this.message.textContent = message;
      this.message.classList.remove('none');
    }
  }

  destroy(): void {
    this.message.remove();
    this.destroyed = true;
  }
}
