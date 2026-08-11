import type { SitemapUrl } from "@nuxtjs/sitemap";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

const localPath = z
  .string()
  .regex(/^\/[A-Za-z0-9._~/-]*$/, "must be an absolute local path")
  .refine((value) => value !== "/", "must not be the root path");

const cacheSchema = z.strictObject({
  maxAge: z.number().int().nonnegative().default(300),
  staleMaxAge: z.number().int().nonnegative().default(0),
  swr: z.boolean().default(true)
});

const sitemapEntrySchema = z.custom<SitemapUrl>(
  (value) =>
    typeof value === "object" &&
    value !== null &&
    "loc" in value &&
    typeof value.loc === "string" &&
    value.loc.length > 0,
  "must be a sitemap entry with a non-empty loc"
);

/** Runtime boundary for directus-sitemaps module configuration. */
export const directusSitemapsOptionsSchema = z.strictObject({
  enabled: enabled.default(true),
  collections: z
    .array(
      z.strictObject({
        collection: z.string().trim().min(1),
        sitemap: z.string().trim().min(1),
        pathPrefix: z.string().trim().optional(),
        endpointPrefix: z.union([z.string().trim(), z.literal(false)]).optional(),
        filter: z.record(z.string(), z.unknown()).default({}),
        fields: z.array(z.string().trim().min(1)).default([])
      })
    )
    .default([]),
  static: z.array(sitemapEntrySchema).default([]),
  apiEndpoint: localPath.default("/api/_directus-sitemaps/urls"),
  enablePrettyUrls: z.boolean().default(true),
  cache: z
    .union([cacheSchema, z.literal(false)])
    .default({ maxAge: 300, staleMaxAge: 0, swr: true }),
  prerender: z.boolean().default(false)
});
