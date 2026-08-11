import type { SitemapUrl } from "@nuxtjs/sitemap";

import type { CollectionSitemapConfig } from "../types/options";

/**
 * Returns configured sitemap names in first-seen order.
 *
 * @param collections Directus collection mappings.
 * @param staticEntries Static sitemap entries.
 * @returns Unique named sitemap keys.
 */
export function getSitemapKeys(
  collections: CollectionSitemapConfig[],
  staticEntries: SitemapUrl[]
): string[] {
  const keys = new Set(collections.map((collection) => collection.sitemap));
  for (const entry of staticEntries) {
    if (typeof entry._sitemap === "string" && entry._sitemap.length > 0) keys.add(entry._sitemap);
  }
  return [...keys];
}

/**
 * Creates the @nuxtjs/sitemap named-source configuration for this module.
 *
 * @param keys Named sitemap keys.
 * @param apiEndpoint Shared source endpoint.
 * @returns Nuxt Sitemap named source configuration.
 */
export function createSitemapSources(keys: string[], apiEndpoint: string) {
  return Object.fromEntries(keys.map((key) => [key, { sources: [apiEndpoint] }]));
}
