import type {
  DirectusCollectionConfig,
  ResolvedDirectusSitemapsOptions,
  SitemapUrl
} from "@onderwijsin/nuxt-directus-config/schema";

declare const config: {
  collections: DirectusCollectionConfig[];
  static: SitemapUrl[];
  queryLimit: ResolvedDirectusSitemapsOptions["queryLimit"];
  failureMode: ResolvedDirectusSitemapsOptions["failureMode"];
};

export default config;
