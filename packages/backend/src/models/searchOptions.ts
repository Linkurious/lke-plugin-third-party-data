import {ParsedQs} from 'qs';

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
      throw new Error('Missing query-string parameter: integrationId');
    }
    if (typeof query.nodeId !== 'string') {
      throw new Error(
        'Missing query-string parameter: nodeId (hint: you possibly forgot to use a {{node}} entry in your action URL)'
      );
    }
    if (typeof query.sourceKey !== 'string') {
      throw new Error(
        'Missing query-string parameter: sourceKey (hint: you possibly forgot to use a {{sourceKey}} entry in your action URL)'
      );
    }

    let maxResults: number | undefined;
    if (typeof query.maxResults === 'string') {
      maxResults = Number(query.maxResults);
      if (Number.isNaN(maxResults)) {
        throw new Error('Invalid query-string parameter: maxResults (must be a number)');
      }
      if (maxResults <= 0 || maxResults > 100) {
        throw new Error('Invalid query-string parameter: maxResults (must be between 1 and 100)');
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
