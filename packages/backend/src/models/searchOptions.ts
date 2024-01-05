import {ParsedQs} from 'qs';

import {STRINGS} from '../../../shared/strings';

export class SearchOptions {
  public readonly integrationId: string;
  public readonly sourceKey: string;
  public readonly nodeId: string;
  public readonly maxResults: number;

  private constructor(params: {
    integrationId: string;
    sourceKey: string;
    nodeId: string;
    maxResults?: number;
  }) {
    this.integrationId = params.integrationId;
    this.sourceKey = params.sourceKey;
    this.nodeId = params.nodeId;
    this.maxResults = params.maxResults ?? 10;
  }

  static from(query: ParsedQs): SearchOptions {
    if (typeof query.integrationId !== 'string') {
      throw new Error(STRINGS.errors.searchOptions.missingIntegrationId);
    }
    if (typeof query.nodeId !== 'string') {
      throw new Error(STRINGS.errors.searchOptions.missingNodeId);
    }
    if (typeof query.sourceKey !== 'string') {
      throw new Error(STRINGS.errors.searchOptions.missingSourceKey);
    }

    let maxResults: number | undefined;
    if (typeof query.maxResults === 'string') {
      maxResults = Number(query.maxResults);
      if (Number.isNaN(maxResults)) {
        throw new Error(STRINGS.errors.searchOptions.invalidMaxResults);
      }
      if (maxResults <= 0 || maxResults > 100) {
        throw new Error(STRINGS.errors.searchOptions.invalidMaxResultsRange(0, 100));
      }
    }

    return new SearchOptions({
      integrationId: query.integrationId,
      nodeId: query.nodeId,
      sourceKey: query.sourceKey,
      maxResults: maxResults
    });
  }
}
