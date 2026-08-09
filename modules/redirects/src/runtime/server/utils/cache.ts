import { useNitroApp, useStorage } from "nitropack/runtime";

import { toRedirectOrigin, toRedirectPath } from "./path";

const CACHE_PREFIX = "cache:redirects";
const INDEX_CACHE_KEY = `${CACHE_PREFIX}:index:all.json`;
const LOOKUP_CACHE_PREFIX = `${CACHE_PREFIX}:lookup:`;

/**
 * Hashes an encoded redirect lookup origin into Nitro-safe key material.
 *
 * Nitro strips non-word characters from custom cache keys. SHA-256 prevents distinct encoded paths
 * such as `%2Ffoo-bar` and `%2Ffoobar` from collapsing into the same cache record.
 *
 * @param origin - Raw or canonical redirect origin.
 * @returns Collision-resistant cache-key material.
 */
export async function hashRedirectLookupOrigin(origin: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(encodeURIComponent(toRedirectOrigin(origin)))
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Returns the Nitro cached-handler key for an encoded redirect lookup origin.
 *
 * @param origin - Raw or canonical redirect origin.
 * @returns Storage key for the cached lookup response.
 */
async function toLookupCacheKey(origin: string): Promise<string> {
  return `${LOOKUP_CACHE_PREFIX}${await hashRedirectLookupOrigin(origin)}.json`;
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
  const cache = useStorage();
  const invalidations = [cache.removeItem(INDEX_CACHE_KEY)];

  if (!canonicalOrigin || toRedirectPath(canonicalOrigin) === canonicalOrigin) {
    const lookupKeys = await cache.getKeys(LOOKUP_CACHE_PREFIX);
    invalidations.push(...lookupKeys.map((key) => cache.removeItem(key)));
  } else {
    invalidations.push(cache.removeItem(await toLookupCacheKey(canonicalOrigin)));
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
