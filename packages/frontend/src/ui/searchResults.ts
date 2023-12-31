import {ServiceFacade} from '../serviceFacade';
import {$elem} from '../utils';
import {IntegrationModelPublic} from '../../../shared/integration/IntegrationModel';
import {VendorSearchResponse, VendorSearchResult} from '../../../shared/api/response';
import {Vendor} from '../../../shared/vendor/vendor';

import {BaseUI} from './baseUI';
import {UiFacade} from './uiFacade';

export class SearchResults extends BaseUI {
  constructor(ui: UiFacade) {
    super(ui);
  }

  async getContent(response: VendorSearchResponse, services: ServiceFacade): Promise<HTMLElement> {
    const vendor = Vendor.getVendorByKey(response.vendorKey);
    const integration = await services.config.getIntegrationPublic(response.integrationId);
    const description = $elem('p', {class: 'mb-3'});
    description.innerHTML = `Results from API: <mark>${vendor.name}</mark>`;
    return $elem('div', {}, [
      $elem('h2', {}, `Search results`),
      description,
      // results
      ...response.results.map((result, index) => {
        return $elem('div', {class: 'row mb-3'}, [
          $elem('div', {class: 'col-1'}, [$elem('em', {}, `#${index}`)]),
          $elem('div', {class: 'col-8'}, [
            this.getSearchResultProperties(integration, result, true),
            // result separator
            $elem('hr', {})
          ]),
          $elem('div', {class: 'col-3'}, [
            this.ui.button.create(
              `See details`,
              {primary: false, classes: ['float-end']},
              async () => {
                const content = $elem('div', {class: 'my-1'}, [
                  this.getSearchResultProperties(integration, result, false),
                  $elem('div', {class: 'd-flex justify-content-end'}, [
                    this.ui.button.create('Close', {primary: false}, () => this.ui.popIn.close())
                  ])
                ]);
                await this.ui.popIn.showElement('Search result details', content);
              }
            ),
            this.ui.button.create(
              `Import result`,
              {primary: true, classes: ['float-end']},
              async () => {
                await services.importSearchResult(integration, result, response.inputNodeId);
              }
            )
          ])
        ]);
      })
    ]);
  }

  private getSearchResultProperties(
    integration: IntegrationModelPublic,
    result: VendorSearchResult,
    filterSelection: boolean
  ): HTMLElement {
    return $elem(
      'div',
      {class: 'mb-3'},
      // result properties
      Object.entries(result.properties)
        .filter(([key]) =>
          filterSelection ? integration.searchResponseFieldSelection.includes(key) : true
        )
        .map(([key, value], index) =>
          $elem('div', {class: 'row'}, [
            // result property key
            $elem(
              'div',
              {
                class:
                  'col-4 text-nowrap font-monospace' + (index % 2 === 0 ? ' text-bg-light' : '')
              },
              key
            ),
            // result property value
            $elem(
              'div',
              {class: 'col-8 text-nowrap' + (index % 2 === 0 ? ' text-bg-light' : '')},
              `${value}`
            )
          ])
        )
    );
  }
}
