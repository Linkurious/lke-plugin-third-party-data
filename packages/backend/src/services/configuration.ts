import {MyPluginConfig, MyPluginConfigPublic} from '../../../shared/myPluginConfig';
import {clone} from '../../../shared/utils';
import {IntegrationModelPublic} from '../../../shared/integration/IntegrationModel';
import {VendorIntegration} from '../../../shared/integration/vendorIntegration';

import {Logger} from './logger';

export class Configuration {
  public readonly config: Required<MyPluginConfig>;
  // @ts-ignore
  private readonly logger: Logger;

  constructor(config: MyPluginConfig, logger: Logger) {
    this.logger = logger;
    this.config = Configuration.validate(config);
  }

  getPublicConfig(): MyPluginConfigPublic {
    const configClone = clone(this.config);
    return {
      basePath: configClone.basePath,
      integrations: configClone.integrations.map((integration) => ({
        ...integration,
        adminSettings: undefined
      })) as IntegrationModelPublic[]
    };
  }

  /**
   * Validate the plugin configuration parameters and add eventual default values.
   * Terminate the plugin in case of errors.
   */
  static validate(config: Partial<MyPluginConfig>): Required<MyPluginConfig> {
    if (config.integrations === undefined) {
      config.integrations = [];
    }
    /*
    if (config.mandatoryParam === null || config.mandatoryParam === undefined) {
      logger.error('Missing mandatory parameter `mandatoryParam`.');
      // process.exit(1);
    }
    */
    return config as Required<MyPluginConfig>;
  }

  getIntegrationById(integrationId: string): VendorIntegration {
    const integration = this.config.integrations.find((i) => i.id === integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }
    return new VendorIntegration(integration);
  }
}
