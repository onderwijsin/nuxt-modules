import { z } from "zod";

/**
 * Schemas in this file are a Zod representation of the SitemapUrl interface and
 * related types from `@nuxtjs/sitemap`, as found in this type defintion file
 * @see https://github.com/nuxt-modules/sitemap/blob/e37a2ca773ea5b3d0159ed8c0ba973ef6fa081b1/src/runtime/types.ts
 */

const dateOrDateStringSchema = z.union([z.date(), z.iso.datetime()]);
const urlOrPathSchema = z.union([z.instanceof(URL), z.string().trim().startsWith("/")]);
const relationship = z.enum(["allow", "deny"]);
const yesNoBoolean = z.union([z.literal("yes"), z.literal("no"), z.boolean()]);

export const priorities = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] as const;

export const changeFrequencies = [
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never"
] as const;

const alternativeEntrySchema = z.strictObject({
  hreflang: z.string(),
  href: urlOrPathSchema
});

const googleNewsEntrySchema = z.strictObject({
  title: z.string(),
  publication_date: dateOrDateStringSchema,
  publication: z.strictObject({
    name: z.string(),
    language: z.string()
  })
});

const imageEntrySchema = z.strictObject({
  loc: urlOrPathSchema,
  caption: z.string().optional(),
  geo_location: z.string().optional(),
  title: z.string().optional(),
  license: urlOrPathSchema.optional()
});

const videoEntrySchema = z.strictObject({
  title: z.string(),
  thumbnail_loc: urlOrPathSchema,
  description: z.string(),
  content_loc: urlOrPathSchema.optional(),
  player_loc: urlOrPathSchema.optional(),
  duration: z.number().nonnegative().optional(),
  expiration_date: dateOrDateStringSchema.optional(),
  rating: z.number().nonnegative().optional(),
  view_count: z.number().nonnegative().optional(),
  publication_date: dateOrDateStringSchema.optional(),
  family_friendly: yesNoBoolean.optional(),

  restriction: z
    .strictObject({
      relationship,
      restriction: z.string()
    })
    .optional(),
  platform: z
    .strictObject({
      relationship,
      platform: z.string()
    })
    .optional(),

  price: z
    .array(
      z.strictObject({
        price: z.union([z.number(), z.string()]).optional(),
        currency: z.string().optional(),
        type: z.enum(["rent", "purchase", "package", "subscription"]).optional()
      })
    )
    .optional(),

  requires_subscription: yesNoBoolean.optional(),

  uploader: z
    .strictObject({
      uploader: z.string(),
      info: urlOrPathSchema.optional()
    })
    .optional(),

  live: yesNoBoolean.optional(),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
  category: z.string().optional(),
  gallery_loc: urlOrPathSchema.optional()
});

export const sitemapUrlSchema = z.strictObject({
  loc: z.string(),
  lastmod: dateOrDateStringSchema.optional(),
  changefreq: z.enum(changeFrequencies).optional(),
  priority: z.literal(priorities).optional(),
  images: z.array(imageEntrySchema).optional(),
  videos: z.array(videoEntrySchema).optional(),
  news: googleNewsEntrySchema.optional(),
  _sitemap: z.string().optional(),
  _encoded: z.boolean().optional(),
  _i18nTransform: z.boolean().optional(),
  alternatives: z.array(alternativeEntrySchema).optional()
});

export type SitemapUrl = z.infer<typeof sitemapUrlSchema>;
