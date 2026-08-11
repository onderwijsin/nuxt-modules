import type { SitemapUrl } from "@nuxtjs/sitemap";
import type { H3Event } from "h3";

import { readItems, readUsers } from "@directus/sdk";
import { useDirectusServer } from "#imports";

import type { CollectionSitemapConfig } from "../../../types/options";

interface CmsRecord {
  date_created?: string;
  date_updated?: string;
  slug?: string;
  seo?: {
    no_index?: boolean;
    sitemap?: { changefreq?: SitemapUrl["changefreq"]; priority?: number | string };
  };
}

/**
 * Produces URLs for one collection using the application's Directus server client.
 *
 * @param event Current request event, when available.
 * @param collection Collection sitemap configuration.
 * @param buildDate Fallback modification date.
 * @returns Sitemap URL entries for the collection.
 */
export async function getCollectionUrls(
  event: H3Event | undefined,
  collection: CollectionSitemapConfig,
  buildDate: string
): Promise<SitemapUrl[]> {
  const fields = [
    ...new Set(["slug", "date_updated", "date_created", "seo", ...(collection.fields ?? [])])
  ];
  const query = { fields, filter: collection.filter, limit: -1 };
  const records = await useDirectusServer(
    collection.endpointPrefix === false || collection.endpointPrefix === ""
      ? readUsers(query)
      : readItems(collection.collection, query),
    event
  );

  if (!Array.isArray(records)) return [];
  return records.flatMap((record) => {
    if (!isCmsRecord(record) || record.seo?.no_index) return [];
    const slug = typeof record.slug === "string" ? record.slug : "";
    if (!slug) console.warn(`Sitemap entry for "${collection.collection}" has an empty slug.`);
    return [
      {
        loc: joinPath(collection.pathPrefix, slug),
        lastmod: record.date_updated ?? record.date_created ?? buildDate,
        changefreq: record.seo?.sitemap?.changefreq ?? "yearly",
        priority: normalizePriority(record.seo?.sitemap?.priority),
        _sitemap: collection.sitemap
      }
    ];
  });
}

/**
 * Builds sitemap entries and preserves successfully fetched collections when others fail.
 *
 * @param event Current request event, when available.
 * @param collections Collection sitemap configurations.
 * @param staticEntries Static sitemap entries.
 * @param sitemap Optional named sitemap filter.
 * @param collection Optional Directus collection filter.
 * @param includeStatic Whether to include static entries.
 * @returns Complete best-effort sitemap entries.
 */
export async function buildSitemapUrls(
  event: H3Event | undefined,
  collections: CollectionSitemapConfig[],
  staticEntries: SitemapUrl[],
  sitemap?: string,
  collection?: string,
  includeStatic = true
): Promise<SitemapUrl[]> {
  const selected = collections.filter(
    (entry) =>
      (!sitemap || entry.sitemap === sitemap) && (!collection || entry.collection === collection)
  );
  const results = await Promise.allSettled(
    selected.map((collection) => getCollectionUrls(event, collection, new Date().toISOString()))
  );
  const dynamic = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    console.error(
      `Unable to build Directus sitemap URLs for "${selected[index]?.collection}".`,
      result.reason
    );
    return [];
  });
  if (!includeStatic) return dynamic;
  const staticUrls = sitemap
    ? staticEntries.filter((entry) => entry._sitemap === sitemap)
    : staticEntries;
  return [...dynamic, ...staticUrls];
}

function isCmsRecord(value: unknown): value is CmsRecord {
  return typeof value === "object" && value !== null;
}

function joinPath(prefix: string | undefined, slug: string): string {
  const base = prefix?.replace(/\/+$/u, "") || "";
  const path = `${base}/${slug.replace(/^\/+|\/+$/gu, "")}`;
  return path === "" ? "/" : path;
}

function normalizePriority(priority: number | string | undefined): number {
  const value = typeof priority === "number" ? priority : Number(priority);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.5;
}
