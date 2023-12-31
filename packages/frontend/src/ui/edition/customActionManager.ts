import {ServiceFacade} from '../../serviceFacade.ts';
import {IntegrationModel} from '../../../../shared/integration/IntegrationModel.ts';
import {$elem} from '../../utils.ts';
import {Vendor} from '../../../../shared/vendor/vendor.ts';

import {AbstractFormPopin, ButtonsConfig} from './abstractFormPopin.ts';

export class CustomActionManager extends AbstractFormPopin<IntegrationModel> {
  private readonly services: ServiceFacade;
  constructor(services: ServiceFacade) {
    super(
      services.ui,
      'Manage custom actions for this integration',
      `Custom actions are used to launch an integration from a node context-menu`
    );
    this.services = services;
  }

  protected override getButtonsConfig(): ButtonsConfig {
    return {
      saveText: undefined,
      closeText: 'Close'
    };
  }

  protected async addContent(content: HTMLElement): Promise<void> {
    const integration = this.getModel();
    if (!integration) {
      throw new Error('Bug: no integration set');
    }
    const actions = await this.services.api.server.customAction.getCustomActions({
      sourceKey: integration.sourceKey
    });
    if (!actions.isSuccess()) {
      throw new Error(`Failed to get custom actions: ${actions.body.message}`);
    }
    const marchingActions = actions.body.filter((a) =>
      a.urlTemplate.includes(`integrationId=${integration.id}`)
    );
    content.appendChild($elem('p', {}));
    if (marchingActions.length === 0) {
      content.append($elem('p', {}, `No custom action found for this integration`));
    } else {
      content.append(
        $elem('p', {}, `Found ${marchingActions.length} custom action(s) for this integration:`),
        $elem(
          'ul',
          {class: 'list-group mb-3'},
          marchingActions.map((action) =>
            $elem(
              'li',
              {class: 'list-group-item d-flex justify-content-between align-items-start'},
              [
                $elem('div', {class: '"ms-2 me-auto'}, [
                  $elem('div', {class: 'fw-bold'}, action.name),
                  $elem('span', {class: 'font-monospace'}, action.urlTemplate)
                ]),
                // classes: ['btn-light']
                this.ui.button.create('Delete', {primary: false, small: true}, async () => {
                  const r = await this.services.api.server.customAction.deleteCustomAction({
                    id: action.id,
                    sourceKey: integration.sourceKey
                  });
                  if (!r.isSuccess()) {
                    throw new Error(`Failed to delete custom action: ${r.body.message}`);
                  }
                })
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
            const vendor = Vendor.getVendorByKey(integration.vendorKey);
            const basePath = await this.services.config.getBasePath();
            await this.services.api.server.customAction.createCustomAction(
              vendor.getCustomAction(integration, basePath)
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
