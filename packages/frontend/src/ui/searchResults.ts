import {ServiceFacade} from '../serviceFacade';
import {IntegrationModelPublic} from '../../../shared/integration/IntegrationModel';
import {VendorSearchResponse, VendorSearchResult} from '../../../shared/api/response';
import {Vendors} from '../../../shared/vendor/vendors.ts';
import {STRINGS} from '../../../shared/strings';

import {$elem} from './uiUtils';
import {BaseUI} from './baseUI';
import {UiFacade} from './uiFacade';

export class SearchResults extends BaseUI {
  constructor(ui: UiFacade) {
    super(ui);
  }

  async getContent(response: VendorSearchResponse, services: ServiceFacade): Promise<HTMLElement> {
    const vendor = Vendors.getVendorByKey(response.vendorKey);
    const integration = await services.config.getIntegrationPublic(response.integrationId);
    const description = $elem('p', {class: 'mb-3'});
    description.innerHTML = `Results from API <mark>${vendor.name}</mark> for node #${response.inputNodeId}:`;

    if (response.results.length === 0) {
      return $elem('p', {class: 'text-center my-3'}, STRINGS.ui.searchResults.noResults);
    }

    return $elem('div', {}, [
      $elem('h2', {}, STRINGS.ui.searchResults.title),
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
              STRINGS.ui.searchResults.detailsButton,
              {primary: false, classes: ['float-end', 'mb-2']},
              async () => {
                const content = $elem('div', {class: 'my-1'}, [
                  this.getSearchResultProperties(integration, result, false),
                  $elem('div', {class: 'd-flex justify-content-end'}, [
                    this.ui.button.create(STRINGS.ui.global.closeButton, {primary: false}, () =>
                      this.ui.popIn.close()
                    )
                  ])
                ]);
                await this.ui.popIn.showElement(
                  STRINGS.ui.searchResults.detailsModalTitle,
                  content
                );
              }
            ),
            this.ui.button.create(
              STRINGS.ui.searchResults.importButton,
              {primary: true, classes: ['float-end', 'mb-2']},
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
                class: 'col-4 text-break font-monospace' + (index % 2 === 0 ? ' text-bg-light' : '')
              },
              key
            ),
            // result property value
            $elem(
              'div',
              {class: 'col-8 text-break' + (index % 2 === 0 ? ' text-bg-light' : '')},
              typeof value === 'string'
                ? value.split('\n\n').map((line) => $elem('div', {}, line))
                : `${value}`
            )
          ])
        )
    );
  }
}
