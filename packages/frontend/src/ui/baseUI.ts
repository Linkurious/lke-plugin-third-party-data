import {UiFacade} from './uiFacade';

export abstract class BaseUI {
  protected readonly ui: UiFacade;

  protected constructor(uiFacade: UiFacade) {
    this.ui = uiFacade;
  }
}
