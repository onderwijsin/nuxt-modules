import { useNitroApp, useStorage } from "nitropack/runtime";

import { toRedirectOrigin, toRedirectPath } from "./path";

const CACHE_PREFIX = "/cache:redirects";
const INDEX_CACHE_KEY = `${CACHE_PREFIX}:index:all.json`;
const LOOKUP_CACHE_PREFIX = `${CACHE_PREFIX}:lookup:`;

/**
 * Matches Nitro's custom event-handler cache-key escaping.
 *
 * @param key - Unescaped cache key supplied by the lookup endpoint.
 * @returns The cache-safe key segment used by Nitro.
 */
function toNitroCacheKey(key: string): string {
  return key.replace(/\W/g, "");
}

/**
 * Returns the Nitro cached-handler key for an encoded redirect lookup origin.
 *
 * @param origin - Raw or canonical redirect origin.
 * @returns Storage key for the cached lookup response.
 */
function toLookupCacheKey(origin: string): string {
  return `${LOOKUP_CACHE_PREFIX}${toNitroCacheKey(encodeURIComponent(toRedirectOrigin(origin)))}.json`;
}

/**
 * Invalidates cached public responses affected by a redirect mutation.
 *
 * A path-only redirect is also the fallback for every query on that path, so all lookup entries
 * must be cleared. A query-specific redirect affects only its exact encoded lookup key.
 *
 * @param origin - Redirect origin being added, changed, or removed.
 */
export async function invalidateRedirectCache(origin: string): Promise<void> {
  const canonicalOrigin = toRedirectOrigin(origin);
  const cache = useStorage();
  const invalidations = [cache.removeItem(INDEX_CACHE_KEY)];

  if (toRedirectPath(canonicalOrigin) === canonicalOrigin) {
    invalidations.push(cache.clear(LOOKUP_CACHE_PREFIX));
  } else {
    invalidations.push(cache.removeItem(toLookupCacheKey(canonicalOrigin)));
  }
  await Promise.all(invalidations);
}

/**
 * Rebuilds the exact lookup cache entry after a successful upsert.
 *
 * @param origin - Newly written redirect origin.
 */
export async function primeRedirectLookupCache(origin: string): Promise<void> {
  await useNitroApp().localFetch(`/api/_redirects/${encodeURIComponent(toRedirectOrigin(origin))}`);
}
