import {PluginConfig} from '@linkurious/rest-client';

import {IntegrationModel, IntegrationModelPublic} from './integration/IntegrationModel';

export interface MyPluginConfig extends PluginConfig {
  integrations?: IntegrationModel[];
}

export interface MyPluginConfigPublic extends PluginConfig {
  integrations?: IntegrationModelPublic[];
}
