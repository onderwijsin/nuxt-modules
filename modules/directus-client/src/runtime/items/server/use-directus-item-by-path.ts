import type { CollectionType, Query, RegularCollections } from "@directus/sdk";
import type { H3Event } from "h3";
import type { Schema } from "#directus";

import { createServerDirectusClient } from "../../client/server/create-client";
import { resolveDirectusRuntimeRequestContext } from "../../client/server/request-context";
import { fetchDirectusItemByPath } from "../fetch-by-path";

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
  const client = createServerDirectusClient(event);
  return fetchDirectusItemByPath(collection, query, preview, client.request);
}
