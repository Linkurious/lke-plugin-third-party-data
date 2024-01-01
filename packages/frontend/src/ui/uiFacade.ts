import {User} from '@linkurious/rest-client';

import {ServiceFacade} from '../serviceFacade';
import {IntegrationModel} from '../../../shared/integration/IntegrationModel';
import {VendorSearchResponse} from '../../../shared/api/response';
import {asError} from '../../../shared/utils';

import {$hide, $id} from './uiUtils';
import {PopIn} from './popIn';
import {LongTask} from './longTask';
import {IntegrationList} from './integrationList';
import {IntegrationEditor} from './integrationEditor';
import {Button} from './button';
import {SearchResults} from './searchResults';
import {CustomActionManager} from './edition/customActionManager';

export class UiFacade {
  private readonly services: ServiceFacade;
  public readonly button: Button;
  public readonly popIn: PopIn;
  public readonly longTask: LongTask;
  private readonly searchResults: SearchResults;
  constructor(services: ServiceFacade) {
    this.services = services;
    this.button = new Button(this);
    this.popIn = new PopIn(this);
    this.longTask = new LongTask(this);
    this.searchResults = new SearchResults(this);
  }

  private showContent(content: HTMLElement): void {
    $id('content')!.replaceChildren(content);
  }

  init(user: User): void {
    const isAdmin = user.groups.some((g) => g.name === 'admin');
    this.bindButton('btn-integration-add', () => this.services.addIntegration());
    this.bindButton('btn-integration-list', () => this.showIntegrationsList());
    if (!isAdmin) {
      $hide(document.querySelectorAll('.admin-btn'));
    }

    if (window.opener) {
      this.bindButton('btn-close', async () => window.close());
    } else {
      $hide(document.querySelectorAll('#btn-close'));
    }
  }

  bindButton(id: string, handler: () => Promise<unknown>, longTask = false): void {
    const button = $id(id);
    if (!button) {
      throw new Error(`Button ${id} not found`);
    }
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    button.addEventListener('click', async () => {
      try {
        if (longTask) {
          await this.longTask.run(null, handler);
        } else {
          await handler();
        }
      } catch (e) {
        void this.popIn.show('error', asError(e).message);
      }
    });
  }

  async showSearchResponse(response: VendorSearchResponse): Promise<void> {
    console.log('SHOW_SEARCH_RESPONSE');
    const content = await this.searchResults.getContent(response, this.services);
    this.showContent(content);
  }

  async editIntegration(model: Partial<IntegrationModel>): Promise<IntegrationModel | undefined> {
    return new IntegrationEditor(this.services).show(model);
  }

  async showIntegrationsList(): Promise<void> {
    console.log('SHOW_INTEGRATIONS_LIST');
    const integrationList = new IntegrationList(this.services);
    await integrationList.show();
  }

  async showCustomActionManager(integration: IntegrationModel): Promise<void> {
    const cam = new CustomActionManager(this.services);
    await cam.show(integration);
  }
}
