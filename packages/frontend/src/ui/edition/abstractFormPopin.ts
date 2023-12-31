import {$elem} from '../../utils';
import {BaseUI} from '../baseUI';
import {UiFacade} from '../uiFacade';

export interface ButtonsConfig {
  saveText: string | undefined;
  closeText: string;
}

export abstract class AbstractFormPopin<T> extends BaseUI {
  private model: T | undefined;
  private readonly title: string;
  private readonly description: string;
  private validationMessage?: HTMLElement;
  private contentContainer?: HTMLElement;

  protected constructor(ui: UiFacade, title: string, description: string) {
    super(ui);
    this.title = title;
    this.description = description;
  }

  protected getButtonsConfig(): ButtonsConfig {
    return {
      saveText: 'Next',
      closeText: 'Cancel'
    };
  }

  protected setModel(model: T): void {
    this.model = model;
  }

  getModel(): T | undefined {
    return this.model;
  }

  protected abstract addContent(content: HTMLElement): Promise<void>;

  protected getExtraFooter(): HTMLElement | undefined {
    return undefined;
  }

  /**
   * Called to get the validation error when the "next" button is clicked.
   */
  protected async getValidationError(): Promise<string | undefined> {
    return undefined;
  }
  /**
   * Manually set/unset the validation error.
   */
  protected setValidationError(error?: string): boolean {
    if (!this.validationMessage) {
      return false;
    }
    if (error) {
      this.validationMessage.textContent = error;
      return true;
    } else {
      this.validationMessage.textContent = '';
      return false;
    }
  }

  protected async redrawContent(): Promise<void> {
    if (!this.contentContainer) {
      return;
    }
    // clear content
    this.contentContainer.replaceChildren();

    // (re)add content
    await this.addContent(this.contentContainer);

    // (re) add optional footer element
    const extraFooterElement = this.getExtraFooter();
    if (extraFooterElement) {
      this.contentContainer.appendChild(extraFooterElement);
    }
  }

  /**
   * <select class="form-select">
   *   <option value="abcdef">Source 1</option>
   *   <option value="abc123">Source 2</option>
   * </select>
   * <button class="btn btn-primary">Next</button>
   */
  async show(model?: T): Promise<T | undefined> {
    if (model) {
      this.setModel(model);
    }
    const content = document.createElement('div');

    // description
    content.appendChild($elem('p', {}, this.description));

    // content
    this.contentContainer = $elem('div');
    content.appendChild(this.contentContainer);
    await this.redrawContent();

    // validation message
    this.validationMessage = $elem('div');
    this.validationMessage.classList.add('text-danger', 'mb-3');
    this.validationMessage.textContent = '';
    content.appendChild(this.validationMessage);

    const buttons = $elem('div', {class: 'd-flex justify-content-end'});
    content.appendChild(buttons);

    // buttons & validation message
    return new Promise<T | undefined>((resolve) => {
      const config = this.getButtonsConfig();
      if (config.saveText) {
        buttons.appendChild(
          this.ui.button.create(config.saveText, {primary: true}, async () => {
            // handle validation error
            const error = await this.getValidationError();
            if (this.setValidationError(error)) {
              // there was an error, don't resolve
              return;
            }

            // close the popin and resolve with the form value
            this.ui.popIn.close();
            resolve(this.model);
          })
        );
      }
      buttons.appendChild(
        this.ui.button.create(config.closeText, {}, () => {
          this.ui.popIn.close();
          resolve(undefined);
        })
      );

      void this.ui.popIn.showElement(this.title, content, true);
    });
  }
}
