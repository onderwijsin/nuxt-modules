import { useNitroApp, useRuntimeConfig, useStorage } from "nitropack/runtime";
import { hash } from "ohash";

import { toRedirectOrigin, toRedirectPath } from "./path";

const CACHE_PREFIX = "cache:redirects";
const INDEX_CACHE_KEY = `${CACHE_PREFIX}:index:all.json`;
const LOOKUP_CACHE_PREFIX = `${CACHE_PREFIX}:lookup:`;

/**
 * Returns the cache key base routed through the configured redirects storage mount.
 *
 * Nitro's cached handlers use the root storage instance. Prefixing the cache base with the mount
 * name routes those entries through that mount while preserving the existing cache key shape.
 *
 * @returns Mount-aware cache base for Nitro cached handlers.
 */
export function getRedirectCacheBase(): string {
  return `${useRuntimeConfig().redirects?.storageMount ?? "redirects"}:cache`;
}

/**
 * Hashes an encoded redirect lookup origin into Nitro-safe key material.
 *
 * Nitro strips non-word characters from custom cache keys. ohash provides SHA-256-backed hashing;
 * replacing its URL-safe hyphen keeps the result lossless after Nitro normalizes the key. This
 * prevents distinct encoded paths such as `%2Ffoo-bar` and `%2Ffoobar` from collapsing together.
 *
 * @param origin - Raw or canonical redirect origin.
 * @returns Collision-resistant cache-key material.
 */
export function hashRedirectLookupOrigin(origin: string): string {
  return hash(encodeURIComponent(toRedirectOrigin(origin))).replaceAll("-", "_");
}

/**
 * Returns the Nitro cached-handler key for an encoded redirect lookup origin.
 *
 * @param origin - Raw or canonical redirect origin.
 * @returns Storage key for the cached lookup response.
 */
function toLookupCacheKey(origin: string): string {
  return `${LOOKUP_CACHE_PREFIX}${hashRedirectLookupOrigin(origin)}.json`;
}

/**
 * Invalidates cached public responses affected by a redirect mutation.
 *
 * A complete refresh or path-only redirect is also the fallback for every query on that path, so
 * all lookup entries must be cleared. A query-specific redirect affects only its exact lookup key.
 *
 * @param origin - Redirect origin being added, changed, or removed. Omit for a complete refresh.
 */
export async function invalidateRedirectCache(origin?: string): Promise<void> {
  const canonicalOrigin = origin ? toRedirectOrigin(origin) : null;
  const cache = useStorage(useRuntimeConfig().redirects?.storageMount ?? "redirects");
  const invalidations = [cache.removeItem(INDEX_CACHE_KEY)];

  if (!canonicalOrigin || toRedirectPath(canonicalOrigin) === canonicalOrigin) {
    const lookupKeys = await cache.getKeys(LOOKUP_CACHE_PREFIX);
    invalidations.push(...lookupKeys.map((key) => cache.removeItem(key)));
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
