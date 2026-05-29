import {ServiceFacade} from '../serviceFacade';
import {Vendors} from '../../../shared/vendor/vendors.ts';
import {STRINGS} from '../../../shared/strings';

import {$elem} from './uiUtils';
import {BaseUI} from './baseUI';

export class IntegrationList extends BaseUI {
  private readonly services: ServiceFacade;
  constructor(services: ServiceFacade) {
    super(services.ui);
    this.services = services;
  }

  public async show(): Promise<void> {
    const integrations = await this.services.config.getIntegrations();
    const dataSources = await this.services.api.getDataSources();

    const table = document.createElement('table');
    table.classList.add('table', 'table-striped', 'table-hover');

    const head = document.createElement('thead');
    table.appendChild(head);

    const headRow = document.createElement('tr');
    headRow.append(
      $elem('th', {scope: 'col'}, 'id'),
      $elem('th', {scope: 'col'}, STRINGS.ui.integrationList.vendorHeader),
      $elem('th', {scope: 'col'}, STRINGS.ui.integrationList.dataSourceHeader),
      $elem('th', {scope: 'col'}, STRINGS.ui.integrationList.inputNodeHeader),
      $elem('th', {scope: 'col'}, STRINGS.ui.integrationList.outputNodeHeader),
      $elem('th', {scope: 'col', class: 'text-end pe-3'}, STRINGS.ui.integrationList.actionsHeader)
    );
    head.appendChild(headRow);

    const tableBody = document.createElement('tbody');
    table.append(tableBody);

    for (const int of integrations) {
      const row = document.createElement('tr');
      row.append(
        $elem('td', {}, int.id),
        $elem('td', {}, Vendors.getVendorByKey(int.vendorKey).name),
        $elem(
          'td',
          {},
          dataSources.find((s) => s.key === int.sourceKey)?.name ?? `${int.sourceKey} (offline)`
        ),
        $elem('td', {}, int.inputNodeCategory),
        $elem('td', {}, int.outputNodeCategory),
        $elem('td', {}, [
          $elem('div', {class: 'd-flex justify-content-end'}, [
            this.ui.button.create(STRINGS.ui.integrationList.editButton, {small: true}, () =>
              this.services.editIntegration(int.id)
            ),
            this.ui.button.create(
              STRINGS.ui.integrationList.installButton,
              {small: true, outline: true},
              () => {
                return this.services.createCustomAction(int, 'integration-list');
              }
            ),
            this.ui.button.create(
              STRINGS.ui.integrationList.deleteButton,
              {type: 'danger', outline: true, small: true},
              async () => {
                row.remove();
                await this.services.deleteIntegration(int.id);
              }
            )
          ])
        ])
      );
      tableBody.appendChild(row);
    }

    const buttons = [
      this.ui.button.create(STRINGS.ui.global.closeButton, {type: 'secondary'}, () =>
        this.ui.popIn.close()
      ),
      this.ui.button.create(STRINGS.ui.integrationList.addButton, {}, () =>
        this.services.addIntegration()
      )
    ];

    const content = $elem('div', {}, [table]);
    await this.ui.popIn.showElement(STRINGS.ui.integrationList.title, content, buttons, true);
  }
}
