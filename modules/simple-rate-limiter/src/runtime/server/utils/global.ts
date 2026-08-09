import { useStorage } from "nitropack/runtime";

export const GLOBAL_STORAGE_NAMESPACE = "simple-rate-limiter:global";
export const DEFAULT_STALE_AFTER_SECONDS = 24 * 60 * 60;

export interface GlobalRateLimitEntry {
  timestamps: number[];
  bannedUntil?: number;
}

export interface GlobalPruningSummary {
  scanned: number;
  pruned: number;
  retained: number;
}

/**
 * Removes timestamps and bans that can no longer affect global rate-limit decisions.
 *
 * @param staleAfterSeconds - Minimum retention period for timestamps, in seconds.
 * @param now - Current Unix timestamp in milliseconds.
 * @returns Counts of scanned, pruned, and retained records.
 */
export async function pruneGlobalRateLimitStorage(
  staleAfterSeconds: number,
  now = Date.now()
): Promise<GlobalPruningSummary> {
  const storage = useStorage<GlobalRateLimitEntry>(GLOBAL_STORAGE_NAMESPACE);
  const keys = await storage.getKeys();
  const cutoff = now - staleAfterSeconds * 1000;
  let pruned = 0;
  let retained = 0;

  for (const key of keys) {
    const current = await storage.getItem(key);
    if (!current) {
      await storage.removeItem(key);
      pruned++;
      continue;
    }

    const timestamps = current.timestamps.filter((timestamp) => timestamp > cutoff);
    const bannedUntil = current.bannedUntil;
    const hasActiveBan = typeof bannedUntil === "number" && bannedUntil > now;

    if (timestamps.length === 0 && !hasActiveBan) {
      await storage.removeItem(key);
      pruned++;
      continue;
    }

    if (timestamps.length !== current.timestamps.length || !hasActiveBan) {
      await storage.setItem(key, {
        timestamps,
        ...(hasActiveBan ? { bannedUntil } : {})
      });
    }
    retained++;
  }

  return { scanned: keys.length, pruned, retained };
}
