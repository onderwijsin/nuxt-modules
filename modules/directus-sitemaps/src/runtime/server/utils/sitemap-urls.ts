import type { H3Event } from "h3";
import { z } from "zod";
import { readItems, type Query } from "@directus/sdk";
import {
  sitemapUrlSchema,
  type DirectusCollectionConfig,
  type SitemapUrl
} from "@onderwijsin/nuxt-directus-config/schema";
import {
  attempt,
  isArray,
  isFunction,
  isRecord,
  hasKey,
  isDefined,
  fromEntries,
  toEntries
} from "@onderwijsin/nuxt-module-utils/shared";

import { useDirectusServer } from "@onderwijsin/nuxt-directus-client/runtime/server";

type GenericDirectusSchema = Record<string, Array<Record<string, unknown>>>;
type GenericDirectusQuery = Query<GenericDirectusSchema, GenericDirectusSchema[string][number]>;

/**
 * Fetches entries from a collection by that collection's config
 * - If provided, uses the custom fetcher to retrieve entries.
 * - If no custom fetcher is provided, uses the default Directus server fetcher, with optional
 *   fields and filters applied. If no fields are provided, a `["*"]` is used.
 *
 * @param event Current request event, when available.
 * @param config Portable collection configuration.
 * @param queryLimit Maximum number of records requested per built-in Directus page.
 * @param failureMode Behavior when a collection page cannot be fetched.
 * @returns An array of unknown items
 */
export async function fetchItemsFromCollection(
  event: H3Event | undefined,
  config: DirectusCollectionConfig,
  queryLimit = 100,
  failureMode: "best-effort" | "hard-failure" = "best-effort"
): Promise<unknown[]> {
  if (config.sitemap === false) return [];

  const { sitemap } = config;

  const context = {
    collection: config.collection,
    fields: sitemap.fields ?? ["*"],
    filter: sitemap.filter ?? {}
  };

  if (isFunction(sitemap.fetcher)) {
    const records = await sitemap.fetcher(context);
    return isArray(records) ? records : [];
  }

  const records: unknown[] = [];
  let offset = 0;

  while (true) {
    const pageResult = await attempt(() =>
      useDirectusServer(
        readItems<GenericDirectusSchema, string, GenericDirectusQuery>(context.collection, {
          fields: context.fields,
          filter: context.filter,
          limit: queryLimit,
          offset
        }),
        event
      )
    );
    if (pageResult.error !== null) {
      if (failureMode === "hard-failure") throw pageResult.error;
      console.error(
        `Unable to fetch Directus sitemap collection page for "${context.collection}" at offset ${offset}.`,
        pageResult.error
      );
      return [];
    }

    const page = pageResult.data;
    const pageRecords = isArray(page) ? page : [];
    records.push(...pageRecords);
    if (pageRecords.length < queryLimit) return records;
    offset += queryLimit;
  }
}

/**
 * Validates the custom sitemap url mapper result, and optionally appends the named sitemap
 * to the entry
 *
 * If an entry is considered invalid, an error is logged, but no error is thrown. This prevents
 * an entire sitemap being defect for one malformed entry.
 *
 * @param entry - The result from the custom sitemap URL mapper.
 * @param _sitemap - Optional namespace for this sitemap
 * @returns a validated SitemapUrl compatible with @nuxtjs/sitemap
 */
export function toSitemapUrl(entry: unknown, _sitemap?: string): SitemapUrl | null {
  // If not and object, or if not indexable, return early
  if (!entry || !isRecord(entry) || (hasKey(entry, "noIndex") && entry.noIndex)) return null;

  const { noIndex: _, ...sitemapEntry } = entry;

  const parsed = sitemapUrlSchema.safeParse(sitemapEntry);

  if (!parsed.success) {
    console.error("Invalid sitemap entry");
    console.info(z.prettifyError(parsed.error));
    return null;
  }

  return {
    ...parsed.data,
    _sitemap
  };
}

/**
 * Maps sitemap fields from a Directus item using a declarative field map.
 *
 * @param item Directus record to map.
 * @param fieldmap Sitemap property names and their Directus source properties.
 * @returns The mapped sitemap candidate, or the original item when it is not an object.
 */
export function mapDirectusItem(item: unknown, fieldmap: Record<string, string>): unknown {
  if (!isRecord(item)) return item;

  return fromEntries(toEntries(fieldmap).map(([target, source]) => [target, item[source]]));
}

type EnabledCollectionConfig = Omit<DirectusCollectionConfig, "sitemap"> & {
  sitemap: Exclude<DirectusCollectionConfig["sitemap"], false>;
};

/**
 * Builds a full sitemap index based on the provided sitemap config.
 * 1. Fetches entries
 * 2. Applies mapper
 * 3. Validates and transforms results
 *
 * The builder is lenient - one malformed entry does not invalidate a whole collection. One
 * failed collection fetch does not block the entire sitemap.
 *
 * @param event Current request event, when available.
 * @param collections Portable collection configurations.
 * @param staticEntries Additional static sitemap entries.
 * @param options Options for building the sitemap URLs.
 * @param options.filterByCollection Optional collection filter, so that only entries from that collection are used in the sitemap index
 * @param options.excludeStaticUrls Whether to exclude static entries.
 * @returns Complete best-effort sitemap entries.
 */
export async function buildSitemapUrls(
  event: H3Event | undefined,
  collections: DirectusCollectionConfig[],
  staticEntries: SitemapUrl[],
  options: {
    filterByCollection?: string;
    excludeStaticUrls?: boolean;
    queryLimit?: number;
    failureMode?: "best-effort" | "hard-failure";
  } = {}
): Promise<SitemapUrl[]> {
  const {
    filterByCollection,
    excludeStaticUrls,
    queryLimit = 100,
    failureMode = "best-effort"
  } = options;

  const selectedCollections = collections.filter(
    (entry): entry is EnabledCollectionConfig =>
      entry.sitemap !== false && (!filterByCollection || entry.collection === filterByCollection)
  );

  // Fetch and map each selected collection concurrently; collection-level failures are handled
  // after all promises settle so best-effort mode can retain successful collections.
  const results = await Promise.allSettled(
    selectedCollections.map(async (collectionConfig) => {
      const records = await fetchItemsFromCollection(
        event,
        collectionConfig,
        queryLimit,
        failureMode
      );
      const { sitemap } = collectionConfig;
      const mappingResult = await attempt(() => {
        const mappedRecords = records.flatMap((record) => {
          if (!isDefined(record) || record === null) return [];

          const entry = isFunction(sitemap.mapper)
            ? sitemap.mapper(record)
            : sitemap.fieldmap
              ? mapDirectusItem(record, sitemap.fieldmap)
              : record;

          const sitemapUrl = toSitemapUrl(entry, sitemap._sitemap);
          return sitemapUrl ? [sitemapUrl] : [];
        });
        return mappedRecords.filter((record): record is SitemapUrl => record !== null);
      });
      if (mappingResult.error !== null || mappingResult.data === null) {
        console.error(
          `Unable to map Directus sitemap URLs for "${collectionConfig.collection}".`,
          mappingResult.error
        );
        return [];
      }
      return mappingResult.data;
    })
  );

  // Flatten successful collection results and apply hard-failure behavior to rejected fetches or
  // mapping operations without discarding unrelated successful collections.
  const processedResults = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    console.error(
      `Unable to build Directus sitemap URLs for "${selectedCollections[index]?.collection}".`,
      result.reason
    );
    if (failureMode === "hard-failure") throw result.reason;
    return [];
  });

  return excludeStaticUrls ? processedResults : [...processedResults, ...staticEntries];
}
