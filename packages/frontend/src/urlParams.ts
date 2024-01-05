export class UrlParams {
  parse(query: URLSearchParams): State {
    const required = ['sourceKey', 'nodeId', 'integrationId', 'action'];
    const missing: string[] = [];
    for (const key of required) {
      if (!query.get(key)) {
        // if the parameter is undefined, null or and empty string, add to 'missing'
        missing.push(key);
      }
    }

    if (missing.length === required.length) {
      // no parameters at all, empty success state
      return {action: 'none', error: false};
    }

    if (missing.length > 0) {
      return {
        error: true,
        errorMessage: `Missing required parameters: ${missing.join(', ')}`
      };
    }

    const actions = query.get('action')!;
    if (actions === 'search') {
      // all required parameters are present and valid: 'search' success state
      return {
        error: false,
        action: 'search',
        sourceKey: query.get('sourceKey')!,
        nodeId: query.get('nodeId')!,
        integrationId: query.get('integrationId')!
      };
    } else {
      return {
        error: true,
        errorMessage: `Unknown action: ${actions}`
      };
    }
  }
}

export type State = ErrorState | SuccessState;
interface BaseState<E extends boolean> {
  error: E;
}
export interface ErrorState extends BaseState<true> {
  errorMessage: string;
}
interface BaseSuccessState<A> extends BaseState<false> {
  action: A;
}
export type SuccessState = EmptySuccessState | SearchSuccessState;
export interface EmptySuccessState extends BaseSuccessState<'none'> {}
export interface SearchSuccessState extends BaseSuccessState<'search'> {
  action: 'search';
  sourceKey: string;
  nodeId: string;
  integrationId: string;
}
