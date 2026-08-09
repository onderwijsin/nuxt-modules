import type { Storage } from "unstorage";
import { z } from "zod";
import { getCacheIndexPrefix, getCacheMetadataKey, normalizeCacheBase } from "../../index";

const cacheIndexRecordSchema = z.string().min(1);

/** One cache-domain invalidation target. */
export interface CacheInvalidationTarget {
  /** Cache base that scopes index lookup. */
  base: string;
  /** Public route path to invalidate. */
  path: string;
  /** Whether to match one route or that route's path prefix. */
  match: "exact" | "prefix";
}

/**
 * Removes values and associated metadata records for the requested cache targets.
 * @param storage - Cache storage mount.
 * @param targets - Base-scoped paths to invalidate.
 * @param maxInvalidatedEntries - Maximum records that one request may remove.
 * @returns The number of matching index records removed.
 */
export async function invalidateCacheTargets(
  storage: Storage,
  targets: CacheInvalidationTarget[],
  maxInvalidatedEntries: number
): Promise<number> {
  const indexKeys = new Set<string>();

  for (const target of targets) {
    const base = normalizeCacheBase(target.base);
    const indexPrefix = getCacheIndexPrefix(base);
    const candidates = await storage.getKeys(indexPrefix);
    for (const indexKey of candidates) {
      const path = getPathFromIndexKey(indexPrefix, indexKey);
      if (path && matchesPath(path, target.path, target.match)) indexKeys.add(indexKey);
    }
  }

  if (indexKeys.size > maxInvalidatedEntries) {
    throw new Error(
      `Cache invalidation exceeds the configured ${maxInvalidatedEntries}-entry limit.`
    );
  }

  let removed = 0;
  for (const indexKey of indexKeys) {
    const cacheKey = cacheIndexRecordSchema.safeParse(await storage.getItem(indexKey));
    if (!cacheKey.success) {
      // Expired values and interrupted writes can leave an index without a cache entry.
      await storage.removeItem(indexKey);
      continue;
    }

    await storage.removeItem(cacheKey.data);
    await storage.removeItem(getCacheMetadataKey(cacheKey.data));
    await storage.removeItem(indexKey);
    removed += 1;
  }

  return removed;
}

/**
 * Extracts the decoded request path embedded in a reverse-index key.
 * @param indexPrefix - Prefix associated with the target cache base.
 * @param key - Candidate reverse-index key.
 * @returns The decoded request path, or null when the record is malformed.
 */
function getPathFromIndexKey(indexPrefix: string, key: string): string | null {
  if (!key.startsWith(indexPrefix)) return null;

  const [encodedPath] = key.slice(indexPrefix.length).split(":", 1);
  if (!encodedPath) return null;

  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

/**
 * Checks whether an indexed request path matches the requested invalidation target.
 * @param path - Indexed public request path.
 * @param targetPath - Requested public request path.
 * @param match - Exact or prefix matching mode.
 * @returns Whether the index record must be invalidated.
 */
function matchesPath(path: string, targetPath: string, match: "exact" | "prefix"): boolean {
  return match === "exact" ? path === targetPath : path.startsWith(targetPath);
}
