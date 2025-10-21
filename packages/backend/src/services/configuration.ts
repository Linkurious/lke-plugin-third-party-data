import express = require('express');

import {MyPluginConfig, MyPluginConfigPublic} from '../../../shared/myPluginConfig';
import {clone} from '../../../shared/utils';
import {IntegrationModelPublic} from '../../../shared/integration/IntegrationModel';
import {VendorIntegration} from '../../../shared/integration/vendorIntegration';
import {STRINGS} from '../../../shared/strings';
import {API} from '../server/api';
import {ConfigOptions} from '../models/configOptions';
import {Vendors} from '../../../shared/vendor/vendors';

import {Logger} from './logger';

type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

type ValidConfig = RequiredFields<MyPluginConfig, 'integrations'>;

export class Configuration {
  private static MY_CONFIG_KEY = 'third-party-data';
  private config: ValidConfig;
  // @ts-ignore
  private readonly logger: Logger;
  private readonly api: API;

  constructor(config: MyPluginConfig, api: API, logger: Logger) {
    this.logger = logger;
    this.api = api;
    this.config = Configuration.validate(config);
  }

  getPublicConfig(): MyPluginConfigPublic {
    const configClone = clone(this.config);
    return {
      basePath: configClone.basePath,
      integrations: (configClone.integrations ?? []).map((integration) => ({
        ...integration,
        adminSettings: undefined
      })) as IntegrationModelPublic[]
    };
  }

  getConfigFull(): MyPluginConfig {
    return this.config;
  }

  async setConfigFull(req: express.Request, config: ConfigOptions): Promise<void> {
    // validate
    const validConfig = Configuration.validate(config.data);

    // update the LKE config
    const pathToUpdate = await this.getLkeConfigPath(req);
    this.logger.info(`Updating plugin config in: ${pathToUpdate}`);
    await this.api.server(req).config.updateConfiguration({
      path: pathToUpdate,
      configuration: validConfig
    });

    // update the plugin's config cache
    this.config = validConfig;
  }

  private async getLkeConfigPath(req: express.Request): Promise<string> {
    const fullLkeConfigR = await this.api.server(req).config.getConfiguration();
    if (!fullLkeConfigR.isSuccess()) {
      throw new Error('Cannot load Linkurious configuration');
    }
    const configs = (fullLkeConfigR.body.plugins ?? {})[Configuration.MY_CONFIG_KEY];
    if (Array.isArray(configs)) {
      if (configs.length === 1) {
        return `plugins.${Configuration.MY_CONFIG_KEY}.0`;
      }
      const basePath = this.config.basePath;
      const index = configs.findIndex((config: ValidConfig) => config.basePath === basePath);
      if (index < 0) {
        throw new Error(`Cannot find the configuration path for ${Configuration.MY_CONFIG_KEY}`);
      }
      return `plugins.${Configuration.MY_CONFIG_KEY}.${index}`;
    } else {
      return `plugins.${Configuration.MY_CONFIG_KEY}`;
    }
  }

  /**
   * Validate the plugin configuration parameters and add eventual default values.
   * Terminate the plugin in case of errors.
   */
  static validate(config: Partial<MyPluginConfig>): ValidConfig {
    if (typeof config.basePath !== 'string') {
      throw new Error('Invalid configuration: basePath must be a string');
    }
    if (config.integrations === undefined) {
      config.integrations = [];
    }
    for (const integration of config.integrations) {
      const vendor = Vendors.getVendorByKey(integration.vendorKey);
      const as = integration.adminSettings;
      if (typeof as !== 'object' || as === null) {
        throw new Error(`${vendor.key}: "adminSettings" is invalid (must be an object)`);
      }
      for (const [key, value] of Object.entries(as)) {
        const field = vendor.adminFields.find((adminField) => adminField.key === key);
        if (!field) {
          throw new Error(`${vendor.key}: "adminSettings" field ${key} is unexpected`);
        }
        if (value === undefined) {
          if (field.required) {
            throw new Error(`${vendor.key}: adminSettings.${key} is required`);
          } else {
            // not required and undefined, okay
          }
        } else {
          // value is defined
          if (field.type === 'string' && typeof value !== 'string') {
            throw new Error(`${vendor.key}: adminSettings.${key} must be a string`);
          }
          if (field.type === 'boolean' && typeof value !== 'boolean') {
            throw new Error(`${vendor.key}: adminSettings.${key} must be a boolean`);
          }
        }
      }
    }
    /*
    if (config.mandatoryParam === null || config.mandatoryParam === undefined) {
      logger.error('Missing mandatory parameter `mandatoryParam`.');
      // process.exit(1);
    }
    */
    return config as ValidConfig;
  }

  getIntegrationById(integrationId: string): VendorIntegration {
    const integration = this.config.integrations.find((i) => i.id === integrationId);
    if (!integration) {
      throw new Error(STRINGS.errors.getIntegrationById(integrationId));
    }
    return new VendorIntegration(integration);
  }
}
