import {UiFacade} from './uiFacade.ts';

export abstract class BaseUI {
  protected readonly ui: UiFacade;

  protected constructor(uiFacade: UiFacade) {
    this.ui = uiFacade;
  }
}
