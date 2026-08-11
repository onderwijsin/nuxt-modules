import type { CollectionType, Query, RegularCollections } from "@directus/sdk";
import type { Schema } from "#directus";
import { useRoute, useRuntimeConfig } from "#imports";

import { parseDirectusPreviewContext } from "../../utils/preview";
import { fetchDirectusItemByPath } from "../../utils/item";
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
  return fetchDirectusItemByPath(collection, query, preview, useDirectus);
}
