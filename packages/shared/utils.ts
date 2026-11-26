export function randomString(chars: string, length: number): string {
  if (chars.length < 2) {
    throw new Error('at least 2 chars must be provided');
  }
  let r = '';
  for (let i = 0; i < length; ++i) {
    // note: Math.random is always *strictly* less than 1
    r += chars[Math.floor(Math.random() * chars.length)];
  }
  return r;
}

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function asError(e: unknown): Error {
  if (e instanceof Error) {
    return e;
  }
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    if ('name' in e && typeof e.name === 'string') {
      return e as Error;
    } else {
      return new Error(e.message);
    }
  }
  return {name: 'error', message: String(e)};
}
