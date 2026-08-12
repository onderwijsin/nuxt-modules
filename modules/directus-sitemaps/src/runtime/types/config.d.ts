import type {
  DirectusCollectionConfig,
  SitemapUrl
} from "@onderwijsin/nuxt-directus-config/schema";

declare const config: {
  collections: DirectusCollectionConfig[];
  static: SitemapUrl[];
};

export default config;
