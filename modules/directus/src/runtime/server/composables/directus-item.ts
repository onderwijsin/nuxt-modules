import { readItems, type CollectionType, type Query, type RegularCollections } from "@directus/sdk";
import type { H3Event } from "h3";
import type { Schema } from "#directus";

import { createServerDirectusClient } from "../utils/client";
import { resolveDirectusRuntimeRequestContext } from "../utils/credentials";

/** Server-side equivalent of `useDirectusItemByPath`.
 * @param event Nitro request event.
 * @param collection Directus collection name.
 * @param query Directus item query.
 * @returns The first matching item or null.
 */
export async function useDirectusServerItemByPath<
  Collection extends RegularCollections<Schema>,
  const TQuery extends Query<Schema, CollectionType<Schema, Collection>>
>(event: H3Event, collection: Collection, query: TQuery) {
  const preview = resolveDirectusRuntimeRequestContext(event).preview;
  const requestQuery: TQuery & { limit: 1; version?: string } = {
    ...query,
    limit: 1,
    ...(preview.version ? { version: preview.version } : {})
  };
  const client = createServerDirectusClient(event);
  const items = await client.request(readItems(collection, requestQuery));
  return items[0] ?? null;
}
