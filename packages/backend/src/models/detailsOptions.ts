import {ParsedQs} from 'qs';

import {STRINGS} from '../../../shared/strings';

export class DetailsOptions {
  public readonly integrationId: string;
  public readonly searchResultId: string;

  private constructor(params: {integrationId: string; searchResultId: string}) {
    this.integrationId = params.integrationId;
    this.searchResultId = params.searchResultId;
  }

  static from(query: ParsedQs): DetailsOptions {
    if (typeof query.integrationId !== 'string') {
      throw new Error(STRINGS.errors.detailsOptions.missingIntegrationId);
    }
    if (typeof query.searchResultId !== 'string') {
      throw new Error(STRINGS.errors.detailsOptions.missingSearchResultId);
    }

    return new DetailsOptions({
      integrationId: query.integrationId,
      searchResultId: query.searchResultId
    });
  }
}
