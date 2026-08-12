import { z } from "zod";
// Registers the shared Zod sensitivity method used below.
import "./sensitive";
import { sitemapUrlSchema } from "./sitemap-entry";

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
  sitemapsPathPrefix: "/__sitemap__/",
  enablePrettyUrls: true,
  cache: directusSitemapsCacheSchemaDefaults,
  prerenderSitemaps: false
};

/**
 * Schema for the Directus sitemap configuration.
 */
export const directusSitemapsSchema = z
  .object({
    static: z.array(sitemapUrlSchema).default(directusSitemapsSchemaDefaults.static),
    apiEndpoint: z.string().startsWith("/").default(directusSitemapsSchemaDefaults.apiEndpoint),
    sitemapsPathPrefix: z
      .string()
      .startsWith("/")
      .default(directusSitemapsSchemaDefaults.sitemapsPathPrefix),
    enablePrettyUrls: z.boolean().default(directusSitemapsSchemaDefaults.enablePrettyUrls),
    cache: directusSitemapsCacheSchema,
    prerenderSitemaps: z.boolean().default(directusSitemapsSchemaDefaults.prerenderSitemaps)
  })
  .sensitive();

export type DirectusSitemapsOptions = z.input<typeof directusSitemapsSchema>;
export type ResolvedDirectusSitemapsOptions = z.output<typeof directusSitemapsSchema>;
