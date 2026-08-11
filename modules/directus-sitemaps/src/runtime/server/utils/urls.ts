import type { H3Event } from "h3";
import { readItems } from "@directus/sdk";
import {
  directusSitemapEntrySchema,
  type DirectusCollectionConfig,
  type DirectusSitemapEntry
} from "@onderwijsin/nuxt-directus-config/schema";
import { isArray } from "@onderwijsin/nuxt-module-utils/shared";
import { useDirectusServer } from "#imports";

type SitemapUrl = Omit<DirectusSitemapEntry, "path" | "lastUpdated" | "noIndex"> & {
  loc: string;
  lastmod?: string;
};

interface StaticSitemapUrl {
  loc: string;
  [key: string]: unknown;
}

/**
 * Produces URLs for one collection with its configured fetcher and mapper.
 *
 * @param event Current request event, when available.
 * @param config Portable collection configuration.
 * @returns Mapped indexable sitemap URL entries.
 */
export async function getCollectionUrls(
  event: H3Event | undefined,
  config: DirectusCollectionConfig
): Promise<SitemapUrl[]> {
  if (config.sitemap === false) return [];
  const sitemap = config.sitemap;
  const context = {
    collection: config.collection,
    fields: sitemap.fields ?? ["*"],
    filter: sitemap.filter ?? {}
  };
  const records = sitemap.fetcher
    ? await sitemap.fetcher(context)
    : await useDirectusServer(
        readItems<Record<string, Record<string, unknown>>>(context.collection, {
          fields: context.fields,
          filter: context.filter,
          limit: -1
        }),
        event
      );

  if (!isArray(records)) return [];
  return records.flatMap((record) => toSitemapUrls(sitemap.mapper(record)));
}

/**
 * Builds sitemap entries and preserves successful collections when another collection fails.
 *
 * @param event Current request event, when available.
 * @param collections Portable collection configurations.
 * @param staticEntries Additional static sitemap entries.
 * @param collection Optional collection filter.
 * @param includeStatic Whether to include static entries.
 * @returns Complete best-effort sitemap entries.
 */
export async function buildSitemapUrls(
  event: H3Event | undefined,
  collections: DirectusCollectionConfig[],
  staticEntries: StaticSitemapUrl[],
  collection?: string,
  includeStatic = true
): Promise<Array<SitemapUrl | StaticSitemapUrl>> {
  const selected = collections.filter(
    (entry) => entry.sitemap !== false && (!collection || entry.collection === collection)
  );
  const results = await Promise.allSettled(
    selected.map((entry) => getCollectionUrls(event, entry))
  );
  const dynamic = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    console.error(
      `Unable to build Directus sitemap URLs for "${selected[index]?.collection}".`,
      result.reason
    );
    return [];
  });
  return includeStatic ? [...dynamic, ...staticEntries] : dynamic;
}

function toSitemapUrls(result: unknown): SitemapUrl[] {
  if (!result) return [];
  const entries = isArray(result) ? result : [result];
  return entries.flatMap((entry) => {
    const parsed = directusSitemapEntrySchema.safeParse(entry);
    if (!parsed.success) {
      console.error("Directus sitemap mapper returned an invalid sitemap entry.", parsed.error);
      return [];
    }
    const sitemapEntry: DirectusSitemapEntry = parsed.data;
    return sitemapEntry.noIndex
      ? []
      : [
          {
            loc: sitemapEntry.path,
            lastmod: sitemapEntry.lastUpdated,
            priority: sitemapEntry.priority
          }
        ];
  });
}
