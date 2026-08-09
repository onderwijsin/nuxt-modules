const INDEX_PREFIX = "__cache_meta:index:v1:";
const METADATA_SUFFIX = "$";
const CACHE_BASE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*:[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/**
 * Normalizes and validates a route-rule cache base.
 * @param value - Raw cache base input.
 * @returns The validated cache base.
 */
export function normalizeCacheBase(value: string): string {
  const base = value.trim();
  if (!CACHE_BASE_PATTERN.test(base)) {
    throw new Error("Cache base must use the <group>:<name> format.");
  }
  return base;
}

/**
 * Returns the metadata sidecar key for a cache value.
 * @param key - Concrete cache storage key.
 * @returns The metadata record key.
 */
export function getCacheMetadataKey(key: string): string {
  return `${key}${METADATA_SUFFIX}`;
}

/**
 * Returns the reverse path-index key for one cache value.
 * @param base - Route-rule cache base.
 * @param path - Normalized request path.
 * @param key - Concrete cache storage key.
 * @returns The reverse-index record key.
 */
export function getCacheIndexKey(base: string, path: string, key: string): string {
  return `${INDEX_PREFIX}${normalizeCacheBase(base)}:${encodeURIComponent(path)}:${encodeURIComponent(key)}`;
}

/**
 * Returns the storage-key prefix for a cache base's reverse index records.
 * @param base - Route-rule cache base.
 * @returns The index key prefix.
 */
export function getCacheIndexPrefix(base?: string): string {
  return base ? `${INDEX_PREFIX}${normalizeCacheBase(base)}:` : INDEX_PREFIX;
}

/**
 * Returns whether a cache-storage key belongs to module-managed metadata.
 * @param key - Cache storage key to inspect.
 * @returns Whether the key is internal.
 */
export function isInternalCacheKey(key: string): boolean {
  return key.startsWith(INDEX_PREFIX) || key.endsWith(METADATA_SUFFIX);
}

/**
 * Derives the route-rule cache base from a concrete cache key.
 * @param key - Concrete cache storage key.
 * @returns The cache base, or null when the key does not follow the expected convention.
 */
export function getCacheBaseFromKey(key: string): string | null {
  const [group, name] = key.split(":", 3);
  if (!group || !name) return null;

  const base = `${group}:${name}`;
  const suffix = key.slice(base.length + 1);
  return CACHE_BASE_PATTERN.test(base) && suffix ? base : null;
}
