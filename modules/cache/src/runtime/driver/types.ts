/** Metadata stored beside a cache value. */
export interface CacheEntryMetadata {
  /** Metadata format version for future-compatible reads. */
  version: 1;
  /** Public request path that populated this cache entry. */
  path: string;
}

/** Options for wrapping an Unstorage driver with cache metadata support. */
export interface CacheDriverOptions {
  /** Returns the request path for the cache write, overriding Nitro's active request when supplied. */
  getRequestPath?: () => string | null | undefined;
}

/** Credentials used by the Cloudflare KV bulk-delete API. */
export interface CloudflareCacheDriverOptions extends CacheDriverOptions {
  /** Cloudflare account containing the KV namespace. */
  accountId: string;
  /** API token with permission to delete keys in the KV namespace. */
  kvApiToken: string;
  /** KV namespace identifier used by Cloudflare's REST API. */
  cacheNamespaceId: string;
}
