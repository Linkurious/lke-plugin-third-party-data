import {ServiceFacade} from '../serviceFacade.ts';
import {VendorModel} from '../../../shared/vendor/vendor.ts';
import {$elem, addSelect} from '../utils.ts';
import {VendorAdminField} from '../../../shared/vendor/vendorModel.ts';

import {AbstractSelector} from './abstractSelector.ts';

export type VendorEditorModel = {
  vendor: VendorModel;
  adminSettings: Record<string, string | undefined>;
};

export class VendorSelector extends AbstractSelector<VendorEditorModel> {
  private readonly services: ServiceFacade;

  constructor(services: ServiceFacade) {
    super(
      services.ui,
      'Select third-party data vendor',
      'Select a third-party data vendor for this new integration'
    );
    this.services = services;
  }

  /**
   * note: this also populates the adminSettings on the current vendor is any.
   * @protected
   */
  protected async getChoices(): Promise<VendorEditorModel[]> {
    const current = this.getModel();
    return this.services.vendor.getVendors().map((v) => ({
      vendor: v,
      adminSettings: current?.vendor.key === v.key ? current.adminSettings : {}
    }));
  }

  protected getChoiceKey(optionValue: VendorEditorModel): string {
    return optionValue.vendor.key;
  }

  protected getChoiceName(optionValue: VendorEditorModel): string {
    return optionValue.vendor.name;
  }

  protected override getExtraFooter(): HTMLElement {
    const description = $elem('p', {class: 'my-3'});
    const descriptionText = this.getModel()?.vendor.description;
    if (descriptionText) {
      description.innerHTML = descriptionText;
    }
    const model = this.getModel();
    const settings = $elem(
      'div',
      {class: 'mb-3 form-control'},
      model === undefined
        ? undefined
        : model.vendor.adminFields.map((f, i) => {
            const id = 'admin-field-' + i;
            const left = $elem('div', {class: 'col-5'}, [
              $elem(
                'label',
                {for: id, class: 'form-label'},
                `${f.name}${f.required ? ' *' : ''}`
              )
            ]);
            const right = $elem('div', {class: 'col-7'});
            this.addField(right, f, id, model);
            return $elem('div', {class: 'row my-1'}, [left, right]);
          })
    );
    return $elem('div', {}, [description, settings]);
  }

  private addField(parent: HTMLElement, field: VendorAdminField, id: string, model: VendorEditorModel): void {
    if (field.enum) {
      const NONE = 'no-value';
      const values = field.enum.map((v) => ({key: v, value: v}));
      if (!field.required) {
        values.unshift({key: NONE, value: '(No value)'});
      }
      addSelect(
        parent,
        {label: undefined, selectedKey: model.adminSettings[field.key]},
        id,
        values,
        (value) => {
          if (value === NONE) {
            model.adminSettings[field.key] = undefined;
          } else {
            model.adminSettings[field.key] = value;
          }
        }
      );
    } else {
      const input = document.createElement('input');
      input.id = id;
      input.classList.add('form-control');
      input.value = model.adminSettings[field.key] ?? '';
      input.addEventListener('input', () => {
        model.adminSettings[field.key] = input.value === '' ? undefined : input.value;
      });
      parent.appendChild(input);
    }
  }

  protected override async getValidationError(): Promise<string | undefined> {
    const model = this.getModel();
    if (!model) {
      return 'No vendor selected';
    }
    for (const field of model.vendor.adminFields) {
      const value = model.adminSettings[field.key];
      if (field.required && !value) {
        return `Missing required field: ${field.name}`;
      }
      if (value && field.enum && model.adminSettings[field.key]) {
        if (!field.enum.includes(value)) {
          return `Invalid value for field ${field.name}`;
        }
      }
    }
    return undefined;
  }
}
