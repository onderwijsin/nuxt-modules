import { z } from "zod";

/** Input shape for custom Directus collection fetchers. */
export const directusCollectionFetchContextSchema = z.strictObject({
  collection: z.string().trim().min(1),
  fields: z.array(z.string().trim().min(1)),
  filter: z.record(z.string(), z.unknown())
});

/** Normalized result returned by a sitemap collection mapper. */
export const directusSitemapEntrySchema = z.strictObject({
  path: z.string().trim().startsWith("/"),
  lastUpdated: z.string().optional(),
  noIndex: z.boolean().optional(),
  priority: z.number().min(0).max(1).optional()
});

export type DirectusCollectionFetchContext = z.output<typeof directusCollectionFetchContextSchema>;
export type DirectusSitemapEntry = z.output<typeof directusSitemapEntrySchema>;
export type DirectusCollectionFetcher<Item = unknown> = (
  context: DirectusCollectionFetchContext
) => Promise<readonly Item[]>;
export type DirectusCollectionMapper<Item = unknown, Result = unknown> = (
  item: Item
) => Result | Result[] | null | undefined;

/** Portable executable Directus collection configuration. */
export const directusCollectionConfigSchema = z.strictObject({
  collection: z.string().trim().min(1),
  fields: z.array(z.string().trim().min(1)).optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  mapper: z.custom<DirectusCollectionMapper>(
    (value) => typeof value === "function",
    "must be a function"
  ),
  fetcher: z
    .custom<DirectusCollectionFetcher>((value) => typeof value === "function", "must be a function")
    .optional()
});

export type DirectusCollectionConfig = z.output<typeof directusCollectionConfigSchema>;

/** Legacy-compatible Directus collection mapping used by the sitemap module. */
export const directusSitemapCollectionConfigSchema = z.object({
  collection: z.string().trim().min(1),
  sitemap: z.string().trim().min(1),
  pathPrefix: z.string().trim().optional(),
  endpointPrefix: z.union([z.string().trim(), z.literal(false)]).optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  fields: z.array(z.string().trim().min(1)).optional()
});

export type DirectusSitemapCollectionConfig = z.input<typeof directusSitemapCollectionConfigSchema>;

/** Current sitemap module configuration, to be generalized in the next collection-contract step. */
export const sitemapSchema = z.object({
  collections: z.array(directusSitemapCollectionConfigSchema).default([]),
  static: z
    .array(
      z.custom(
        (value) =>
          typeof value === "object" &&
          value !== null &&
          "loc" in value &&
          typeof value.loc === "string"
      )
    )
    .default([]),
  apiEndpoint: z.string().startsWith("/").default("/api/_directus-sitemaps/urls"),
  enablePrettyUrls: z.boolean().default(true),
  cache: z
    .union([
      z.object({
        maxAge: z.number().int().nonnegative().default(300),
        staleMaxAge: z.number().int().nonnegative().default(0),
        swr: z.boolean().default(true)
      }),
      z.literal(false)
    ])
    .default({ maxAge: 300, staleMaxAge: 0, swr: true }),
  prerender: z.boolean().default(false)
});

export type DirectusSitemapOptions = z.input<typeof sitemapSchema>;
export type ResolvedDirectusSitemapOptions = z.output<typeof sitemapSchema>;
