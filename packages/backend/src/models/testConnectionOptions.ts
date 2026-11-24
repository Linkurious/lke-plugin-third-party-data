import {ParsedQs} from 'qs';

import {STRINGS} from '../../../shared/strings';

export class TestConnectionOptions {
  public readonly integrationId: string;

  private constructor(params: {integrationId: string}) {
    this.integrationId = params.integrationId;
  }

  static from(query: ParsedQs): TestConnectionOptions {
    if (typeof query.integrationId !== 'string') {
      throw new Error(STRINGS.errors.sharedOptions.missingIntegrationId);
    }

    return new TestConnectionOptions({
      integrationId: query.integrationId
    });
  }
}
