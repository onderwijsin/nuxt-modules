import type {
  DirectusCollectionConfig,
  SitemapUrl
} from "@onderwijsin/nuxt-directus-config/schema";

/**
 * Helper that checks if the sitemap config contains any _sitemap namespaces,
 * and thus multiple sitemaps need to be created.
 *
 * Checks both the collection config as well as static entries.
 *
 * @param config The sitemap configuration object containing collections and static entries.
 * @returns boolean indicating whether named sitemaps should be used.
 */
export const shouldUseNamedSitemaps = (config: {
  collections: DirectusCollectionConfig[];
  static: SitemapUrl[];
}) => {
  return (
    config.collections.some(
      (collection) => collection.sitemap !== false && Boolean(collection.sitemap._sitemap)
    ) || config.static.some((entry) => Boolean(entry._sitemap))
  );
};
