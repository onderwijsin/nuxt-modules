import type { DirectusCollectionConfig } from "@onderwijsin/nuxt-directus-config/schema";

declare const config: {
  collections: DirectusCollectionConfig[];
  static: Array<{ loc: string; [key: string]: unknown }>;
};

export default config;
