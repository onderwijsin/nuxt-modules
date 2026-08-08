import { createError, defineEventHandler, getQuery, getRouterParam } from "h3";
import { listQuerySchema, mountParamSchema } from "../../../../utils/schema";
import {
  assertAllowedPrefix,
  getAllowedMount,
  isInternalStorageKey
} from "../../../../utils/storage-admin";
import { useStorage } from "nitropack/runtime";

/**
 * Lists permitted entries in a configured storage mount.
 * @param event - Current H3 request event.
 * @returns A bounded page of permitted storage entries.
 */
export default defineEventHandler(async (event) => {
  const mountResult = mountParamSchema.safeParse({ mount: getRouterParam(event, "mount") ?? "" });
  const queryResult = listQuerySchema.safeParse(getQuery(event));
  if (!mountResult.success || !queryResult.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid storage list request" });
  }

  const { prefix, cursor, limit, metadata, page: requestedPage, search } = queryResult.data;
  const { config, mount } = getAllowedMount(event, mountResult.data.mount, "read");
  if (prefix) assertAllowedPrefix(config, mount, prefix);

  const storage = useStorage(mountResult.data.mount);
  const bases = prefix ? [prefix] : mount.allowRoot ? [""] : mount.prefixes;
  const pageSize = Math.min(limit ?? config.defaultLimit, config.maxLimit);
  const keys = [...new Set((await Promise.all(bases.map((base) => storage.getKeys(base)))).flat())]
    .filter((key) => !isInternalStorageKey(config, key))
    .sort();
  const entries = await Promise.all(
    keys.map(async (key) => {
      const entryMetadata = metadata || search ? await storage.getMeta(key) : null;
      const path = typeof entryMetadata?.path === "string" ? entryMetadata.path : null;
      return { key, metadata: entryMetadata, path };
    })
  );
  const normalizedSearch = search?.toLocaleLowerCase();
  const filteredEntries = normalizedSearch
    ? entries.filter(
        (entry) =>
          entry.key.toLocaleLowerCase().includes(normalizedSearch) ||
          entry.path?.toLocaleLowerCase().includes(normalizedSearch)
      )
    : entries;
  const startIndex = requestedPage
    ? (requestedPage - 1) * pageSize
    : cursor
      ? filteredEntries.findIndex((entry) => entry.key > cursor)
      : 0;
  const page = startIndex < 0 ? [] : filteredEntries.slice(startIndex, startIndex + pageSize);
  const nextCursor = page.length === pageSize ? (page.at(-1) ?? null) : null;

  return {
    data: { items: page, nextCursor, page: requestedPage ?? null, total: filteredEntries.length }
  };
});
