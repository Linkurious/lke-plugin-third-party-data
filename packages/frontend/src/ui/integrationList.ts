import {ServiceFacade} from '../serviceFacade';
import {$elem} from '../utils';
import {Vendor} from '../../../shared/vendor/vendor';

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
      $elem('th', {scope: 'col'}, 'Vendor API'),
      $elem('th', {scope: 'col'}, 'Data-Source'),
      $elem('th', {scope: 'col'}, 'Input node'),
      $elem('th', {scope: 'col'}, 'Output node'),
      $elem('th', {scope: 'col', class: 'text-end pe-3'}, 'Actions')
    );
    head.appendChild(headRow);

    const tableBody = document.createElement('tbody');
    table.append(tableBody);

    for (const int of integrations) {
      const row = document.createElement('tr');
      row.append(
        $elem('td', {}, Vendor.getVendorByKey(int.vendorKey).name),
        $elem(
          'td',
          {},
          dataSources.find((s) => s.key === int.sourceKey)?.name ?? `${int.sourceKey} (offline)`
        ),
        $elem('td', {}, int.inputNodeCategory),
        $elem('td', {}, int.outputNodeCategory),
        $elem('td', {class: 'd-flex justify-content-end'}, [
          this.ui.button.create('Edit', {primary: true, small: true}, () =>
            this.services.editIntegration(int.id)
          ),
          this.ui.button.create('Install', {small: true, primary: true, outline: true}, () => {
            return this.services.createCustomAction(int, 'integration-list');
          }),
          this.ui.button.create('Delete', {small: true}, () => {
            row.remove();
            return this.services.config.deleteIntegration(int.id);
          })
        ])
      );
      tableBody.appendChild(row);
    }

    const footer = $elem('div', {class: 'd-flex justify-content-end'}, [
      this.ui.button.create('Add integration', {primary: true}, () =>
        this.services.addIntegration()
      ),
      this.ui.button.create('Close', {}, () => this.ui.popIn.close())
    ]);

    const content = $elem('div', {}, [table, footer]);
    await this.ui.popIn.showElement('Integrations list', content, true);
  }
}
