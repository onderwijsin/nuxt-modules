import type { Driver, StorageMeta } from "unstorage";
import { getContext } from "unctx";
import {
  getCacheBaseFromKey,
  getCacheIndexKey,
  getCacheMetadataKey,
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
      await driver.removeItem?.(key, transactionOptions);
      await driver.removeItem?.(getCacheMetadataKey(key), transactionOptions);

      const base = getCacheBaseFromKey(key);
      if (base && metadata?.path) {
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
      return isInternalCacheKey(base) ? keys : keys.filter((key) => !isInternalCacheKey(key));
    }
  };
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
  if (typeof raw !== "string") return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      "path" in parsed &&
      parsed.version === 1 &&
      typeof parsed.path === "string"
    ) {
      return { version: 1, path: parsed.path };
    }
  } catch {
    return null;
  }

  return null;
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

  const existing = await readMetadata(driver, key, transactionOptions);
  if (existing?.path && existing.path !== path && driver.removeItem) {
    await driver.removeItem(getCacheIndexKey(base, existing.path, key), transactionOptions);
  }

  const metadata: CacheEntryMetadata = { version: 1, path };
  await driver.setItem(getCacheMetadataKey(key), JSON.stringify(metadata), transactionOptions);
  await driver.setItem(getCacheIndexKey(base, path, key), key, transactionOptions);
}
