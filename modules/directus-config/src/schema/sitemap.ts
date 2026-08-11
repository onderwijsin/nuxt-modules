import { z } from "zod";

/**
 * Default values for the directusSitemapsCacheSchema
 */
const directusSitemapsCacheSchemaDefaults = { maxAge: 300, staleMaxAge: 0, swr: true };

/**
 * Zod schema for the Directus sitemap cache configuration.
 */
const directusSitemapsCacheSchema = z
  .union([
    z.object({
      maxAge: z.number().int().nonnegative().default(directusSitemapsCacheSchemaDefaults.maxAge),
      staleMaxAge: z
        .number()
        .int()
        .nonnegative()
        .default(directusSitemapsCacheSchemaDefaults.staleMaxAge),
      swr: z.boolean().default(directusSitemapsCacheSchemaDefaults.swr)
    }),
    z.literal(false)
  ])
  .default(directusSitemapsCacheSchemaDefaults);

/**
 * Default values for the directusSitemapsSchema
 */
const directusSitemapsSchemaDefaults = {
  static: [],
  apiEndpoint: "/api/_directus-sitemaps/urls",
  enablePrettyUrls: true,
  cache: directusSitemapsCacheSchemaDefaults,
  prerenderSitemaps: false
};

/**
 * Schema for the Directus sitemap configuration.
 */
export const directusSitemapsSchema = z
  .object({
    static: z
      .array(
        z.looseObject({
          loc: z.string().trim().min(1)
        })
      )
      .default(directusSitemapsSchemaDefaults.static),
    apiEndpoint: z.string().startsWith("/").default(directusSitemapsSchemaDefaults.apiEndpoint),
    enablePrettyUrls: z.boolean().default(directusSitemapsSchemaDefaults.enablePrettyUrls),
    cache: directusSitemapsCacheSchema,
    prerenderSitemaps: z.boolean().default(directusSitemapsSchemaDefaults.prerenderSitemaps)
  })
  .sensitive();

export type DirectusSitemapsOptions = z.input<typeof directusSitemapsSchema>;
export type ResolvedDirectusSitemapsOptions = z.output<typeof directusSitemapsSchema>;
