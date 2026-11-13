import 'server-only';
import * as React from 'react';

type AnyFn = (...args: never[]) => unknown;

/**
 * Per-request memoisation (React.cache). The bundled @types/react does not
 * declare `cache`, so it is read through a typed cast. Falls back to the
 * original function when `cache` is not available.
 */
const reactCache = (React as unknown as { cache?: <T extends AnyFn>(fn: T) => T }).cache;

export function cacheRequest<T extends AnyFn>(fn: T): T {
  return typeof reactCache === 'function' ? reactCache(fn) : fn;
}
