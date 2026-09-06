import { isDefined } from "@onderwijsin/nuxt-module-utils/shared";
import type { EnabledDirectusAssetCacheConfig, DirectusAssetCacheState } from "./cache";
import { pruneAssetCache } from "./prune";

/** Schedules one throttled, best-effort asset-cache prune attempt.
 *
 * @param state Application-owned cache state.
 * @param config Resolved asset-cache configuration.
 * @returns The in-flight background operation, or `undefined` when disabled/throttled.
 */
export function scheduleAssetCachePrune(
  state: DirectusAssetCacheState,
  config: EnabledDirectusAssetCacheConfig
): Promise<void> | undefined {
  if (config.prune.enabled !== true || config.prune.onRequest !== true) return undefined;
  const now = Date.now();
  if (state.prune.promise) return state.prune.promise;
  if (
    isDefined(state.prune.lastAttemptAt) &&
    now - state.prune.lastAttemptAt < config.prune.interval * 1000
  ) {
    return undefined;
  }

  state.prune.lastAttemptAt = now;
  state.prune.promise = pruneAssetCache(config)
    .then(() => undefined)
    .catch((error: unknown) => {
      console.error("[directus-client] Asset cache pruning failed.", error);
    })
    .finally(() => {
      state.prune.promise = undefined;
    });
  return state.prune.promise;
}
