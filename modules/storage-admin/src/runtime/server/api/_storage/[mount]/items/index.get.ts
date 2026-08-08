import { createError, defineEventHandler, getQuery, getRouterParam } from "h3";
import { listQuerySchema, mountParamSchema } from "../../../../utils/schema";
import {
  mapWithStorageConcurrency,
  paginateStorageEntries,
  StorageListingTimeoutError,
  type StorageListEntry,
  type StorageListPage,
  withStorageListingTimeout
} from "../../../../utils/storage-listing";
import {
  assertAllowedPrefix,
  getAllowedMount,
  isInternalStorageKey
} from "../../../../utils/storage-admin";
import { useStorage } from "nitropack/runtime";

interface StorageListResponse {
  data: {
    items: StorageListPage["items"];
    nextCursor: StorageListPage["nextCursor"];
    page: number | null;
    total: number;
  };
}

/**
 * Lists permitted entries in a configured storage mount.
 * @param event - Current H3 request event.
 * @returns A bounded page of permitted storage entries.
 */
export default defineEventHandler(async (event): Promise<StorageListResponse> => {
  // Validate every route/query value before it influences mount selection or driver calls.
  const mountResult = mountParamSchema.safeParse({ mount: getRouterParam(event, "mount") ?? "" });
  const queryResult = listQuerySchema.safeParse(getQuery(event));
  if (!mountResult.success || !queryResult.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid storage list request" });
  }

  const { prefix, cursor, limit, metadata, page: requestedPage, search } = queryResult.data;
  // Resolve the permitted boundary first; an omitted prefix can only aggregate configured bases.
  const { config, mount } = getAllowedMount(event, mountResult.data.mount, "read");
  if (prefix) assertAllowedPrefix(config, mount, prefix);

  const storage = useStorage(mountResult.data.mount);
  const bases = prefix ? [prefix] : mount.allowRoot ? [""] : mount.prefixes;
  const pageSize = Math.min(limit ?? config.defaultLimit, config.maxLimit);
  let listedKeys: string[][];

  try {
    // Drivers enumerate each base independently. Bound both concurrency and individual call time.
    listedKeys = await mapWithStorageConcurrency(bases, config.metadataConcurrency, (base) =>
      withStorageListingTimeout(storage.getKeys(base), config.listTimeoutMs)
    );
  } catch (error: unknown) {
    throw createError({
      statusCode: error instanceof StorageListingTimeoutError ? 504 : 503,
      statusMessage:
        error instanceof StorageListingTimeoutError
          ? "Storage provider timed out while listing keys"
          : "Storage provider failed while listing keys"
    });
  }

  // A driver may return overlapping bases; remove duplicates and hide internal driver records.
  const keys = [...new Set(listedKeys.flat())]
    .filter((key) => !isInternalStorageKey(config, key))
    .sort();

  if (keys.length > config.maxScanKeys) {
    throw createError({
      statusCode: 413,
      statusMessage: "Storage listing exceeds the configured scan limit"
    });
  }

  const createEntry = async (key: string, includeMetadata: boolean): Promise<StorageListEntry> => {
    let entryMetadata: Record<string, unknown> | null = null;

    if (includeMetadata) {
      try {
        entryMetadata = await withStorageListingTimeout(
          Promise.resolve(storage.getMeta(key)),
          config.listTimeoutMs
        );
      } catch {
        entryMetadata = null;
      }
    }

    return {
      key,
      metadata: entryMetadata,
      path: typeof entryMetadata?.path === "string" ? entryMetadata.path : null
    };
  };
  const normalizedSearch = search?.toLocaleLowerCase();
  // Path search needs metadata for the full bounded result set. Ordinary pages fetch metadata later.
  const entries = normalizedSearch
    ? await mapWithStorageConcurrency(keys, config.metadataConcurrency, (key) =>
        createEntry(key, true)
      )
    : [];
  const filteredEntries = normalizedSearch
    ? entries.filter(
        (entry) =>
          entry.key.toLocaleLowerCase().includes(normalizedSearch) ||
          entry.path?.toLocaleLowerCase().includes(normalizedSearch)
      )
    : keys.map((key) => ({ key, metadata: null, path: null }));
  // Apply stable cursor/page pagination before reading optional metadata for the visible page.
  const { items: pageEntries, nextCursor } = paginateStorageEntries(
    filteredEntries,
    pageSize,
    requestedPage,
    cursor
  );
  const page = normalizedSearch
    ? pageEntries
    : await mapWithStorageConcurrency(pageEntries, config.metadataConcurrency, (entry) =>
        createEntry(entry.key, metadata)
      );

  return {
    data: { items: page, nextCursor, page: requestedPage ?? null, total: filteredEntries.length }
  };
});
