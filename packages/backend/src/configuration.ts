import {MyPluginConfig} from '../../shared/myPluginConfig';

import {Logger} from './logger';

export class Configuration {
  /**
   * Validate the plugin configuration parameters and add eventual default values.
   * Terminate the plugin in case of errors.
   */
  static validate(config: Partial<MyPluginConfig>, logger: Logger): MyPluginConfig {
    if (config.optionalParam === null || config.optionalParam === undefined) {
      config.optionalParam = 'default value';
    }
    if (config.mandatoryParam === null || config.mandatoryParam === undefined) {
      logger.error('Missing mandatory parameter `mandatoryParam`.');
      // process.exit(1);
    }
    return config as MyPluginConfig;
  }
}
