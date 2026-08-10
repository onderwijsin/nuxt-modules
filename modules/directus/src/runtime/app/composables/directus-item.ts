import { readItems, type CollectionType, type Query, type RegularCollections } from "@directus/sdk";
import type { Schema } from "#directus";
import { useRoute, useRuntimeConfig } from "#imports";

import { parseDirectusPreviewContext } from "../../utils/preview";
import { useDirectus } from "./directus";

/** Queries one application path and returns the first matching item, or null.
 * @param collection Directus collection name.
 * @param query Directus item query.
 * @returns The first matching item or null.
 */
export async function useDirectusItemByPath<
  Collection extends RegularCollections<Schema>,
  const TQuery extends Query<Schema, CollectionType<Schema, Collection>>
>(collection: Collection, query: TQuery) {
  const config = useRuntimeConfig();
  const preview = parseDirectusPreviewContext(useRoute().query, config.public.directus.preview);
  const requestQuery: TQuery & { limit: 1; version?: string } = {
    ...query,
    limit: 1,
    ...(preview.version ? { version: preview.version } : {})
  };
  const items = await useDirectus(readItems(collection, requestQuery));
  return items[0] ?? null;
}
