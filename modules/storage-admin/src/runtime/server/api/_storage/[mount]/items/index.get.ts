import { createError, defineEventHandler, getQuery, getRouterParam } from "h3";
import { listQuerySchema, mountParamSchema } from "../../../../utils/schema";
import {
  mapWithStorageConcurrency,
  paginateStorageEntries,
  StorageListingDeadlineError,
  type StorageListEntry,
  type StorageListPage,
  withStorageListingDeadline
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

  if (!prefix && mount.prefixes.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "A configured storage prefix is required for listing"
    });
  }

  const storage = useStorage(mountResult.data.mount);
  const bases = prefix ? [prefix] : mount.prefixes;
  const pageSize = Math.min(limit ?? config.defaultLimit, config.maxLimit);
  let listedKeys: string[][];

  try {
    // Drivers enumerate each base independently. Use fixed batching and a response deadline.
    listedKeys = await mapWithStorageConcurrency(bases, (base) =>
      withStorageListingDeadline(storage.getKeys(base))
    );
  } catch (error: unknown) {
    throw createError({
      statusCode: error instanceof StorageListingDeadlineError ? 504 : 503,
      statusMessage:
        error instanceof StorageListingDeadlineError
          ? "Storage provider timed out while listing keys"
          : "Storage provider failed while listing keys"
    });
  }

  // A driver may return overlapping bases; remove duplicates and hide internal driver records.
  const keys = [...new Set(listedKeys.flat())]
    .filter((key) => !isInternalStorageKey(config, key))
    .sort();

  // This is a post-enumeration guard: generic Unstorage drivers return a materialized key array.
  if (keys.length > config.maxListedKeys) {
    throw createError({
      statusCode: 413,
      statusMessage: "Storage listing exceeds the configured scan limit"
    });
  }

  const createEntry = async (key: string, includeMetadata: boolean): Promise<StorageListEntry> => {
    let entryMetadata: Record<string, unknown> | null = null;

    try {
      entryMetadata = await withStorageListingDeadline(Promise.resolve(storage.getMeta(key)));
    } catch {
      entryMetadata = null;
    }

    return {
      key,
      path: typeof entryMetadata?.path === "string" ? entryMetadata.path : null,
      ...(includeMetadata ? { metadata: entryMetadata } : {})
    };
  };
  const normalizedSearch = search?.toLocaleLowerCase();
  // Path search needs metadata for the full bounded result set. Ordinary pages fetch it later.
  const entries = normalizedSearch
    ? await mapWithStorageConcurrency(keys, (key) => createEntry(key, metadata))
    : [];
  const filteredEntries = normalizedSearch
    ? entries.filter(
        (entry) =>
          entry.key.toLocaleLowerCase().includes(normalizedSearch) ||
          entry.path?.toLocaleLowerCase().includes(normalizedSearch)
      )
    : keys.map((key) => ({ key, path: null }));
  // Apply stable cursor/page pagination before reading optional metadata for the visible page.
  const { items: pageEntries, nextCursor } = paginateStorageEntries(
    filteredEntries,
    pageSize,
    requestedPage,
    cursor
  );
  const page = normalizedSearch
    ? pageEntries
    : await mapWithStorageConcurrency(pageEntries, (entry) => createEntry(entry.key, metadata));

  return {
    data: { items: page, nextCursor, page: requestedPage ?? null, total: filteredEntries.length }
  };
});
