import {
  attempt,
  isDefined,
  isFiniteNumber,
  isRecord,
  isString
} from "@onderwijsin/nuxt-module-utils/shared";
import { useStorage } from "nitropack/runtime";
import type { EnabledDirectusAssetCacheConfig } from "./cache";
import { createAssetCacheStorage, resolveAssetCacheStoragePrefix } from "./cache";

export interface AssetCachePruneSummary {
  scanned: number;
  removed: number;
  retained: number;
  skipped: number;
}

type AssetCacheEntryDisposition = "retain" | "expired" | "malformed";

function isUsableAssetCacheValue(value: unknown): boolean {
  if (!isRecord(value) || value.status !== 200 || !isRecord(value.headers)) return false;
  return isString(value.body) || ArrayBuffer.isView(value.body);
}

function resolveDuration(
  entry: Record<string, unknown>,
  key: "maxAge" | "staleMaxAge",
  fallback: number | undefined
): number | undefined {
  const value = entry[key];
  if (!isDefined(value) || value === null) return fallback;
  return isFiniteNumber(value) && value >= 0 ? value : undefined;
}

function classifyEntry(
  entry: unknown,
  config: EnabledDirectusAssetCacheConfig,
  now: number
): AssetCacheEntryDisposition {
  if (!isRecord(entry) || !isFiniteNumber(entry.mtime) || entry.mtime < 0) return "malformed";
  const maxAge = resolveDuration(entry, "maxAge", config.maxAge);
  const staleMaxAge = resolveDuration(entry, "staleMaxAge", config.staleMaxAge);
  if (
    !isDefined(maxAge) ||
    (isDefined(entry.staleMaxAge) && entry.staleMaxAge !== null && !isDefined(staleMaxAge))
  ) {
    return "malformed";
  }
  if (!isUsableAssetCacheValue(entry.value)) return "malformed";
  const age = now - entry.mtime;
  if (maxAge === 0) return "expired";
  if (config.swr !== true) return age > maxAge * 1000 ? "expired" : "retain";
  if (!isDefined(staleMaxAge)) return "retain";
  return age > (maxAge + staleMaxAge) * 1000 ? "expired" : "retain";
}

/** Removes expired or unusable Directus asset-cache entries from owned storage.
 *
 * @param config Resolved asset-cache configuration.
 * @param now Current Unix timestamp in milliseconds.
 * @returns Counts for the sweep.
 */
export async function pruneAssetCache(
  config: EnabledDirectusAssetCacheConfig,
  now = Date.now()
): Promise<AssetCachePruneSummary> {
  const rootStorage = useStorage();
  const mount = rootStorage.getMount(config.storage);
  if (!mount.base) {
    throw new Error(`Directus asset cache storage mount "${config.storage}" is not configured`);
  }
  if (mount.driver?.flags?.ttl === true) {
    return { scanned: 0, removed: 0, retained: 0, skipped: 0 };
  }

  const storage = useStorage(config.storage);
  const prefix = await resolveAssetCacheStoragePrefix();
  const keys = await storage.getKeys(prefix);
  const cacheStorage = createAssetCacheStorage(config.storage);
  const summary: AssetCachePruneSummary = {
    scanned: keys.length,
    removed: 0,
    retained: 0,
    skipped: 0
  };

  for (const key of keys) {
    const read = await attempt(() => cacheStorage.get<unknown>(key));
    if (read.error !== null) {
      summary.skipped++;
      continue;
    }
    const disposition = classifyEntry(read.data, config, now);
    if (read.data === null || disposition === "malformed" || disposition === "expired") {
      const removal = await attempt(() => cacheStorage.set(key, null));
      if (removal.error !== null) summary.skipped++;
      else summary.removed++;
    } else {
      summary.retained++;
    }
  }

  return summary;
}
