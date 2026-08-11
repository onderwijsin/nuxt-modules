import type { SitemapUrl } from "@nuxtjs/sitemap";
import type { z } from "zod";

import type { directusSitemapsOptionsSchema } from "../config/options.schema";

/** A Directus filter forwarded to the Directus items endpoint. */
export type DirectusFilter = Record<string, unknown>;

/** Maps one Directus collection to one named Nuxt Sitemap sitemap. */
export interface CollectionSitemapConfig {
  /** Directus collection to query. */
  collection: string;
  /** Named sitemap receiving the collection URLs. */
  sitemap: string;
  /** Prefix added before each Directus slug. */
  pathPrefix?: string;
  /** Directus REST endpoint prefix; set `false` or an empty string for `users`. */
  endpointPrefix?: string | false;
  /** Directus item filter. */
  filter?: DirectusFilter;
  /** Additional Directus fields. `slug`, dates, and `seo` are always requested. */
  fields?: string[];
}

/** Public directus-sitemaps module configuration. */
export type ModuleOptions = z.input<typeof directusSitemapsOptionsSchema>;

/** Validated directus-sitemaps module configuration. */
export type ResolvedModuleOptions = z.output<typeof directusSitemapsOptionsSchema>;

/** Re-export sitemap entries for consumer configuration. */
export type { SitemapUrl };
