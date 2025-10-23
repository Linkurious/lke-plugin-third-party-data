import {clone} from '../../../shared/utils';

export class ConfigOptions {
  public readonly data: Record<string, unknown>;

  private constructor(config: Record<string, unknown>) {
    this.data = config;
  }

  static from(requestBody: unknown): ConfigOptions {
    if (typeof requestBody !== 'object' || requestBody === null) {
      throw new Error('Configuration content must be an object');
    }
    return new ConfigOptions(clone(requestBody) as Record<string, unknown>);
  }
}
