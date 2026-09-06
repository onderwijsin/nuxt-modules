import type { ResolvedDirectusAssetCacheOptions } from "@onderwijsin/nuxt-directus-config/schema";
import { isFiniteNumber, isRecord } from "@onderwijsin/nuxt-module-utils/shared";
import { useNitroApp, useRuntimeConfig, useStorage } from "nitropack/runtime";
import type { AssetCachePruneSummary, DirectusAssetCacheState } from "./cache";
import {
  createAssetCacheStorage,
  DIRECTUS_ASSET_CACHE_BASE,
  DIRECTUS_ASSET_CACHE_GROUP,
  DIRECTUS_ASSET_CACHE_NAME
} from "./cache";

type AssetCacheConfig = Omit<
  Extract<ResolvedDirectusAssetCacheOptions, { enabled: true }>,
  "prune"
> & {
  prune?: {
    enabled: boolean;
    onRequest: boolean;
    interval: number;
    task: { enabled: boolean; schedule?: string };
  };
};

export const DIRECTUS_ASSET_CACHE_PREFIX = `${DIRECTUS_ASSET_CACHE_BASE}:${DIRECTUS_ASSET_CACHE_GROUP}:${DIRECTUS_ASSET_CACHE_NAME}:`;

function isCacheDuration(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isExpiredEntry(
  entry: Record<string, unknown>,
  config: AssetCacheConfig,
  now: number
): boolean | undefined {
  if (!isFiniteNumber(entry.mtime)) return undefined;
  const maxAge = isCacheDuration(entry.maxAge) ? entry.maxAge : config.maxAge;
  if (config.swr !== true) return entry.mtime + maxAge * 1000 <= now;

  const staleMaxAge = isCacheDuration(entry.staleMaxAge) ? entry.staleMaxAge : config.staleMaxAge;
  if (staleMaxAge === undefined) return false;
  return entry.mtime + (maxAge + staleMaxAge) * 1000 <= now;
}

/** Removes expired Directus asset entries from the configured cache namespace.
 *
 * @param config Resolved asset-cache configuration.
 * @param now Current Unix timestamp in milliseconds.
 * @returns Counts for the sweep.
 */
export async function pruneAssetCache(
  config: AssetCacheConfig,
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
  const keys = await storage.getKeys(DIRECTUS_ASSET_CACHE_PREFIX);
  const cacheStorage = createAssetCacheStorage(config.storage);
  const summary: AssetCachePruneSummary = {
    scanned: keys.length,
    removed: 0,
    retained: 0,
    skipped: 0
  };

  for (const key of keys) {
    try {
      const entry = await cacheStorage.get<unknown>(key);
      if (!isRecord(entry)) {
        summary.skipped++;
        continue;
      }
      const expired = isExpiredEntry(entry, config, now);
      if (expired === undefined) {
        summary.skipped++;
      } else if (expired) {
        await cacheStorage.set(key, null);
        summary.removed++;
      } else {
        summary.retained++;
      }
    } catch {
      summary.skipped++;
    }
  }

  return summary;
}

/** Schedules one best-effort, application-local asset-cache prune attempt.
 *
 * @param state Application-owned cache state.
 * @param config Resolved asset-cache configuration.
 * @returns The in-flight sweep, or `undefined` when throttled or disabled.
 */
export function maybePruneAssetCache(
  state: DirectusAssetCacheState,
  config: AssetCacheConfig
): Promise<AssetCachePruneSummary> | undefined {
  const prune = config.prune ?? {
    enabled: false,
    onRequest: true,
    interval: 3600,
    task: { enabled: false }
  };
  if (prune.enabled !== true || prune.onRequest !== true) return undefined;
  const now = Date.now();
  if (state.prunePromise) return state.prunePromise;
  if (
    state.lastPruneAttemptAt !== undefined &&
    now - state.lastPruneAttemptAt < prune.interval * 1000
  ) {
    return undefined;
  }

  state.lastPruneAttemptAt = now;
  state.prunePromise = pruneAssetCache(config).finally(() => {
    state.prunePromise = undefined;
  });
  return state.prunePromise;
}

/** Runs the reusable asset-cache pruning operation as a Nitro task.
 *
 * @returns Nitro task result counts.
 */
export async function runAssetCachePruneTask(): Promise<{ result: AssetCachePruneSummary }> {
  const config = useRuntimeConfig().directusClient.assets.cache;
  const configRecord: Record<string, unknown> = isRecord(config) ? config : {};
  const pruning = isRecord(configRecord.prune) ? configRecord.prune : undefined;
  if (
    config.enabled !== true ||
    !pruning ||
    pruning.enabled !== true ||
    !isRecord(pruning.task) ||
    pruning.task.enabled !== true
  ) {
    return { result: { scanned: 0, removed: 0, retained: 0, skipped: 0 } };
  }
  return { result: await pruneAssetCache(config) };
}

/** Returns the application-owned asset-cache state used by request orchestration.
 *
 * @returns The current Nitro application's asset-cache state.
 */
export function getAssetCacheState(): DirectusAssetCacheState {
  const state = useNitroApp().directusAssetCache;
  if (!state) throw new Error("Directus asset cache plugin is not registered");
  return state;
}
