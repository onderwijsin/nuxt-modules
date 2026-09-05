import {
  readItem,
  readItems,
  type CollectionType,
  type Query,
  type RegularCollections,
  type RestCommand
} from "@directus/sdk";
import type { Schema } from "#directus";

import type { DirectusPreviewContext } from "../preview/preview";

/** Executes the shared item-by-path lookup against a caller-provided Directus transport.
 * @param collection Directus collection name.
 * @param query Directus item query.
 * @param preview Request-scoped preview context.
 * @param execute Directus command executor.
 * @returns The matching item or null for an empty list lookup.
 */
export async function fetchDirectusItemByPath<
  Collection extends RegularCollections<Schema>,
  const TQuery extends Query<Schema, CollectionType<Schema, Collection>>
>(
  collection: Collection,
  query: TQuery,
  preview: DirectusPreviewContext,
  execute: <Output>(command: RestCommand<Output, Schema>) => Promise<Output>
) {
  if (preview.version && preview.id) {
    return execute(readItem(collection, preview.id, { ...query, version: preview.version }));
  }

  const requestQuery: TQuery & { limit: 1; version?: string } = {
    ...query,
    limit: 1,
    ...(preview.version ? { version: preview.version } : {})
  };
  const items = await execute(readItems(collection, requestQuery));
  return items[0] ?? null;
}
