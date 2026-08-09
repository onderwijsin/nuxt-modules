import type { Driver, StorageMeta } from "unstorage";
import { getContext } from "unctx";
import { attempt, hasKey, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";
import {
  getCacheBaseFromKey,
  getCacheIndexKey,
  getCacheIndexPrefix,
  getCacheMetadataKey,
  getCacheWriteMarkerKey,
  normalizeCacheBase,
  isInternalCacheKey
} from "./keys";
import type { CacheDriverOptions, CacheEntryMetadata } from "./types";

/**
 * Wraps an Unstorage driver with metadata and reverse-index records for cache values.
 * @param driver - Unstorage driver that receives the wrapped cache operations.
 * @param options - Optional request-path resolver.
 * @returns A driver that maintains cache metadata and indexes.
 */
export function createCacheDriver(driver: Driver, options: CacheDriverOptions = {}): Driver {
  const resolveRequestPath = options.getRequestPath ?? getActiveRequestPath;

  return {
    ...driver,
    async setItem(key, value, transactionOptions) {
      if (!driver.setItem) throw new Error("The wrapped cache driver must implement setItem.");

      await driver.setItem(key, value, transactionOptions);
      await writeCacheMetadata(driver, key, transactionOptions, resolveRequestPath);
    },
    async setItems(items, transactionOptions) {
      const setItem = driver.setItem;
      if (!setItem) throw new Error("The wrapped cache driver must implement setItem.");

      if (driver.setItems) {
        await driver.setItems(items, transactionOptions);
      } else {
        await Promise.all(
          items.map((item) =>
            setItem(item.key, item.value, item.options ?? transactionOptions ?? {})
          )
        );
      }
      await Promise.all(
        items.map((item) =>
          writeCacheMetadata(
            driver,
            item.key,
            item.options ?? transactionOptions,
            resolveRequestPath
          )
        )
      );
    },
    async removeItem(key, transactionOptions) {
      const metadata = await readMetadata(driver, key, transactionOptions);
      const writeMarker = await driver.getItem(getCacheWriteMarkerKey(key), transactionOptions);
      await driver.removeItem?.(key, transactionOptions);
      await driver.removeItem?.(getCacheMetadataKey(key), transactionOptions);
      await driver.removeItem?.(getCacheWriteMarkerKey(key), transactionOptions);
      const base = getCacheBaseFromKey(key);
      if (base && metadata?.path && (!metadata.writeId || metadata.writeId === writeMarker)) {
        await driver.removeItem?.(getCacheIndexKey(base, metadata.path, key), transactionOptions);
      }
    },
    async getMeta(key, transactionOptions): Promise<StorageMeta | null> {
      const [nativeMetadata, metadata] = await Promise.all([
        driver.getMeta?.(key, transactionOptions),
        readMetadata(driver, key, transactionOptions)
      ]);
      return { ...nativeMetadata, ...metadata };
    },
    async getKeys(base, transactionOptions) {
      const keys = await driver.getKeys(base, transactionOptions);
      // Invalidation intentionally queries the internal index prefix; normal consumers do not see it.
      return isInternalCacheKey(base ?? "") ? keys : keys.filter((key) => !isInternalCacheKey(key));
    },
    async clear(base, transactionOptions) {
      const cacheBase = getClearCacheBase(base);
      const valuePrefix = cacheBase ? `${cacheBase}:` : "";
      const indexPrefix = getCacheIndexPrefix(cacheBase ?? undefined);
      // Drivers such as memory do not apply the requested base, so filter before destructive work.
      const valueKeys = (await driver.getKeys(valuePrefix, transactionOptions)).filter((key) =>
        key.startsWith(valuePrefix)
      );
      const indexKeys = (await driver.getKeys(indexPrefix, transactionOptions)).filter((key) =>
        key.startsWith(indexPrefix)
      );
      await Promise.all(
        [...new Set([...valueKeys, ...indexKeys])].map((key) =>
          driver.removeItem?.(key, transactionOptions)
        )
      );
    }
  };
}

/**
 * Validates the only supported scoped clear input: one complete cache base.
 * @param base - Unstorage clear prefix.
 * @returns A normalized cache base, or null for a complete cache-mount clear.
 */
function getClearCacheBase(base: string | undefined): string | null {
  if (!base) return null;
  return normalizeCacheBase(base.endsWith(":") ? base.slice(0, -1) : base);
}

/**
 * Returns the active Nitro request path without creating or replacing Nitro's context.
 * @returns The current request path, or null outside a Nitro request.
 */
function getActiveRequestPath(): string | null {
  // Resolve the context lazily: creating it during module evaluation would shadow Nitro's context.
  return getContext<{ event?: { path?: string } }>("nitro-app").tryUse()?.event?.path ?? null;
}

/**
 * Normalizes an optional route path before it is used in metadata or index keys.
 * @param value - Candidate request path.
 * @returns A leading-slash path, or null when no usable path is available.
 */
function normalizeRequestPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path) return null;
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Reads and validates the cache module's sidecar metadata for one cache value.
 * @param driver - Underlying driver containing the sidecar record.
 * @param key - Cache value key.
 * @param transactionOptions - Unstorage options forwarded to the read.
 * @returns Valid metadata, or null when the sidecar is absent or malformed.
 */
async function readMetadata(
  driver: Driver,
  key: string,
  transactionOptions: Record<string, unknown> = {}
): Promise<CacheEntryMetadata | null> {
  const raw = await driver.getItem(getCacheMetadataKey(key), transactionOptions);
  if (!isString(raw)) return null;

  const parsed = await attempt<unknown>(() => JSON.parse(raw));
  if (parsed.error !== null || !isRecord(parsed.data)) return null;
  if (!hasKey(parsed.data, "version") || !hasKey(parsed.data, "path")) return null;
  if (parsed.data.version !== 1 || !isString(parsed.data.path)) return null;

  return {
    version: 1,
    path: parsed.data.path,
    writeId:
      hasKey(parsed.data, "writeId") && isString(parsed.data.writeId)
        ? parsed.data.writeId
        : undefined
  };
}

/**
 * Writes the sidecar metadata and reverse path index after a cache value is stored.
 * @param driver - Underlying driver receiving the internal records.
 * @param key - Cache value key that was written.
 * @param transactionOptions - Unstorage options forwarded to internal writes.
 * @param resolveRequestPath - Resolver for the public path that populated the cache value.
 * @returns Nothing once all related metadata writes finish.
 */
async function writeCacheMetadata(
  driver: Driver,
  key: string,
  transactionOptions: Record<string, unknown> = {},
  resolveRequestPath: () => string | null | undefined
): Promise<void> {
  if (isInternalCacheKey(key) || !driver.setItem) return;

  const base = getCacheBaseFromKey(key);
  const path = normalizeRequestPath(resolveRequestPath());
  if (!base || !path) return;

  const writeId = crypto.randomUUID();
  await driver.setItem(getCacheWriteMarkerKey(key), writeId, transactionOptions);
  if ((await driver.getItem(getCacheWriteMarkerKey(key), transactionOptions)) !== writeId) return;

  const metadata: CacheEntryMetadata = { version: 1, path, writeId };
  await driver.setItem(getCacheMetadataKey(key), JSON.stringify(metadata), transactionOptions);
  if ((await driver.getItem(getCacheWriteMarkerKey(key), transactionOptions)) !== writeId) return;

  await driver.setItem(
    getCacheIndexKey(base, path, key),
    JSON.stringify({ key, writeId }),
    transactionOptions
  );
}
