import {ServiceFacade} from '../../serviceFacade';
import {IntegrationModel} from '../../../../shared/integration/IntegrationModel';
import {$elem} from '../uiUtils';
import {VendorIntegrationPublic} from '../../../../shared/integration/vendorIntegrationPublic';
import {STRINGS} from '../../../../shared/strings';

import {AbstractFormPopin, ButtonsConfig} from './abstractFormPopin';

export class CustomActionManager extends AbstractFormPopin<IntegrationModel> {
  private readonly services: ServiceFacade;
  constructor(services: ServiceFacade) {
    super(
      services.ui,
      STRINGS.ui.customActionManager.title,
      STRINGS.ui.customActionManager.description
    );
    this.services = services;
  }

  protected override getButtonsConfig(): ButtonsConfig {
    return {
      saveText: undefined,
      closeText: STRINGS.ui.global.closeButton
    };
  }

  protected async addContent(content: HTMLElement): Promise<void> {
    const integration = this.getModel();
    if (!integration) {
      throw new Error('Bug: no integration set');
    }
    const actions = await this.services.api.getCustomActions(integration);
    content.appendChild($elem('p', {}));
    if (actions.length === 0) {
      content.append($elem('p', {}, `No custom action found for this integration`));
    } else {
      content.append(
        $elem('p', {}, `Found ${actions.length} custom action(s) for this integration:`),
        $elem(
          'ul',
          {class: 'list-group mb-3'},
          actions.map((action) =>
            $elem(
              'li',
              {class: 'list-group-item d-flex justify-content-between align-items-start'},
              [
                $elem('div', {class: '"ms-2 me-auto'}, [
                  $elem('div', {class: 'fw-bold'}, action.name),
                  $elem('span', {class: 'font-monospace'}, action.urlTemplate)
                ]),
                this.ui.button.create(
                  STRINGS.ui.customActionManager.deleteButton,
                  {primary: false, small: true},
                  async () => {
                    const r = await this.services.api.server.customAction.deleteCustomAction({
                      id: action.id,
                      sourceKey: integration.sourceKey
                    });
                    if (!r.isSuccess()) {
                      throw new Error(STRINGS.errors.customActions.deleteFailed(r.body));
                    }
                    await this.redrawContent();
                  }
                )
              ]
            )
          )
        )
      );
    }
    content.appendChild(
      $elem('div', {class: 'row row-cols-auto'}, [
        $elem('div', {class: 'col'}, [
          this.ui.button.create('Add custom action', {primary: true}, async () => {
            const int = new VendorIntegrationPublic(integration);
            const basePath = await this.services.config.getBasePath();
            await this.services.api.server.customAction.createCustomAction(
              int.getCustomAction(basePath)
            );
            await this.redrawContent();
          })
        ]),
        $elem(
          'div',
          {class: 'col mt-2 p-0'},
          'This will create a new custom action, shared at the data-source level'
        )
      ])
    );
  }
}
