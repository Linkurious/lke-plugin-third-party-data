import {MyPluginConfig, MyPluginConfigPublic} from '../../shared/myPluginConfig';
import {IntegrationModel, IntegrationModelPublic} from '../../shared/integration/IntegrationModel';
import {STRINGS} from '../../shared/strings';

import {API} from './api/api';

export class Configuration {
  private static MY_CONFIG_KEY = 'third-party-data';
  private readonly api: API;
  private configData?: MyPluginConfig;
  private configDataPublic?: MyPluginConfigPublic;

  constructor(api: API) {
    this.api = api;
  }

  private async getConfig(): Promise<Required<MyPluginConfig>> {
    if (!this.configData) {
      this.configData = await this.api.getPluginConfiguration();
    }
    if (!this.configData.integrations) {
      this.configData.integrations = [];
    }
    return this.configData as Required<MyPluginConfig>;
  }

  private async getConfigPublic(): Promise<Required<MyPluginConfigPublic>> {
    if (!this.configDataPublic) {
      this.configDataPublic = await this.api.getPluginConfigurationPublic();
    }
    if (!this.configDataPublic.integrations) {
      this.configDataPublic.integrations = [];
    }
    return this.configDataPublic as Required<MyPluginConfigPublic>;
  }

  private async saveConfig(config: MyPluginConfig): Promise<void> {
    await this.api.server.config.updateConfiguration({
      path: ['plugins', Configuration.MY_CONFIG_KEY].join('.'),
      configuration: config
    });
    this.configData = config;
  }

  /**
   * Get the plugin basePath from the public configuration
   */
  async getBasePath(): Promise<string> {
    const config = await this.getConfigPublic();
    return config.basePath;
  }

  async saveNewIntegration(model: IntegrationModel): Promise<void> {
    console.log('SAVE_NEW_INTEGRATION: ' + JSON.stringify(model));
    const config = await this.getConfig();
    config.integrations.push(model);
    await this.saveConfig(config);
  }

  async saveExistingIntegration(model: IntegrationModel): Promise<void> {
    console.log('SAVE_EXISTING_INTEGRATION: ' + JSON.stringify(model));
    const config = await this.getConfig();
    const index = config.integrations.findIndex((int) => int.id === model.id);
    if (index < 0) {
      throw new Error(STRINGS.errors.updateIntegratioNotFound(model.id));
    }
    config.integrations[index] = model;
    await this.saveConfig(config);
  }

  async getIntegrations(): Promise<IntegrationModel[]> {
    const config = await this.getConfig();
    return config.integrations;
  }

  async deleteIntegration(integrationId: string): Promise<void> {
    const config = await this.getConfig();
    const index = config.integrations.findIndex((i) => i.id === integrationId);
    if (index < 0) {
      throw new Error(STRINGS.errors.integrationNotFound(integrationId));
    }
    config.integrations.splice(index, 1);
    await this.saveConfig(config);
  }

  async getIntegration(integrationId: string): Promise<IntegrationModel> {
    const config = await this.getConfig();
    const int = config.integrations.find((i) => i.id === integrationId);
    if (!int) {
      throw new Error(STRINGS.errors.integrationNotFound(integrationId));
    }
    return int;
  }

  async getIntegrationPublic(integrationId: string): Promise<IntegrationModelPublic> {
    const config = await this.getConfigPublic();
    const int = config.integrations.find((i) => i.id === integrationId);
    if (!int) {
      throw new Error(STRINGS.errors.integrationNotFound(integrationId));
    }
    return int;
  }
}
