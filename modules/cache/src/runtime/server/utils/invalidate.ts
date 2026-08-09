import type { Storage } from "unstorage";
import { z } from "zod";
import {
  getCacheIndexPrefix,
  getCacheMetadataKey,
  getCacheWriteMarkerKey,
  normalizeCacheBase
} from "../../driver/keys";

const cacheIndexRecordSchema = z.union([
  z
    .string()
    .min(1)
    .transform((key) => ({ key })),
  z.strictObject({ key: z.string().min(1), writeId: z.string().uuid() })
]);

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
  const indexPaths = new Map<string, string>();

  for (const target of targets) {
    const base = normalizeCacheBase(target.base);
    const indexPrefix = getCacheIndexPrefix(base);
    const candidates = await storage.getKeys(indexPrefix);
    for (const indexKey of candidates) {
      const path = getPathFromIndexKey(indexPrefix, indexKey);
      if (path && matchesPath(path, target.path, target.match)) indexPaths.set(indexKey, path);
    }
  }

  if (indexPaths.size > maxInvalidatedEntries) {
    throw new Error(
      `Cache invalidation exceeds the configured ${maxInvalidatedEntries}-entry limit.`
    );
  }

  let removed = 0;
  for (const [indexKey, indexPath] of indexPaths) {
    const indexRecord = cacheIndexRecordSchema.safeParse(await storage.getItem(indexKey));
    if (!indexRecord.success) {
      // Expired values and interrupted writes can leave an index without a cache entry.
      await storage.removeItem(indexKey);
      continue;
    }

    if (!(await isCurrentIndexRecord(storage, indexRecord.data, indexPath))) {
      await storage.removeItem(indexKey);
      removed += 1;
      continue;
    }

    await storage.removeItem(indexRecord.data.key);
    await storage.removeItem(getCacheMetadataKey(indexRecord.data.key));
    await storage.removeItem(getCacheWriteMarkerKey(indexRecord.data.key));
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
  if (match === "exact") return path === targetPath;
  const normalizedTargetPath = targetPath.endsWith("/") ? targetPath.slice(0, -1) : targetPath;
  return path === normalizedTargetPath || path.startsWith(`${normalizedTargetPath}/`);
}

/**
 * Checks that an index still points to the cache value's current metadata/write association.
 * @param storage - Cache storage mount.
 * @param indexRecord - Parsed index value.
 * @param indexPath - Public route path decoded from the reverse-index key.
 * @returns Whether the index can safely delete its referenced cache value.
 */
async function isCurrentIndexRecord(
  storage: Storage,
  indexRecord: { key: string; writeId?: string },
  indexPath: string
): Promise<boolean> {
  const metadata = await storage.getMeta(indexRecord.key);
  if (metadata?.path !== indexPath) return false;

  if (!indexRecord.writeId) return true;
  return (
    metadata.writeId === indexRecord.writeId &&
    (await storage.getItem(getCacheWriteMarkerKey(indexRecord.key))) === indexRecord.writeId
  );
}
