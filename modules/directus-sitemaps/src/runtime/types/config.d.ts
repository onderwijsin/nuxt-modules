import type { SitemapUrl } from "@nuxtjs/sitemap";

declare module "@nuxt/schema" {
  interface RuntimeConfig {
    directusSitemaps: {
      collections: Array<{
        collection: string;
        sitemap: string;
        pathPrefix?: string;
        endpointPrefix?: string | false;
        filter: Record<string, unknown>;
        fields: string[];
      }>;
      static: SitemapUrl[];
    };
  }
}

export {};
