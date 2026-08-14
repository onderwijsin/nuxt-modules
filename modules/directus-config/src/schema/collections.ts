import { fromEntries, isFunction, keys } from "@onderwijsin/nuxt-module-utils/shared";
import { z } from "zod";
// Registers the shared Zod sensitivity method used below.
import "./sensitive";
import type { SitemapUrl } from "./sitemap-entry";
import { sitemapUrlSchema } from "./sitemap-entry";

/**
 * Collection field definition
 */
const collection = z.string().trim().min(1);

/**
 * Fields field definition
 */
const fields = z.array(z.string().trim().min(1));

/**
 * Filter field definition
 */
const filter = z.record(z.string(), z.unknown());

/** Input shape for custom Directus collection fetchers. */
export const directusCollectionFetchContextSchema = z.strictObject({
  collection,
  fields,
  filter
});

export type MappedDirectusSitemapEntry = Omit<SitemapUrl, "_sitemap"> & { noIndex?: boolean };

export type DirectusCollectionFetchContext = z.output<typeof directusCollectionFetchContextSchema>;
export type DirectusCollectionFetcher<Item = unknown> = (
  context: DirectusCollectionFetchContext
) => Promise<Item[]>;

export type DirectusCollectionSitemapMapper<Item = unknown> = (
  item: Item
) => MappedDirectusSitemapEntry | null | undefined;

/** Maps one fetched Directus item to one or more prerender routes. */
export type DirectusCollectionPrerenderMapper<Item = unknown> = (
  item: Item
) => string | string[] | null | undefined;

/**
 * Custom collection fetcher
 */
const fetcher = z.custom<DirectusCollectionFetcher>(
  (value) => isFunction(value),
  "must be a function"
);

const {
  loc: _,
  _sitemap: __,
  ...stringShape
} = fromEntries(keys(sitemapUrlSchema.shape).map((key) => [key, z.string().min(1).optional()]));

/** Declarative mapping from sitemap properties to Directus item properties. */
export const directusSitemapFieldMapSchema = z.object({
  ...stringShape,
  loc: z.string().trim().min(1)
});

export type DirectusSitemapFieldMap = z.infer<typeof directusSitemapFieldMapSchema>;

/** Sitemap behavior for one Directus collection. */
export const directusCollectionSitemapSchema = z.strictObject({
  _sitemap: z.string().trim().min(1).optional(),
  fields: fields.optional(),
  filter: filter.optional(),
  fieldmap: directusSitemapFieldMapSchema.optional(),
  mapper: z
    .custom<DirectusCollectionSitemapMapper>((value) => isFunction(value), "must be a function")
    .optional(),
  fetcher: fetcher.optional()
});

/** Build-time prerender behavior for one Directus collection. */
export const directusCollectionPrerenderSchema = z.strictObject({
  fields: fields.optional(),
  filter: filter.optional(),
  fieldmap: z.strictObject({ route: z.string().trim().min(1) }).optional(),
  mapper: z
    .custom<DirectusCollectionPrerenderMapper>((value) => isFunction(value), "must be a function")
    .optional(),
  fetcher: fetcher.optional()
});

/** Portable executable Directus collection configuration. */
export const directusCollectionConfigSchema = z.strictObject({
  collection,
  sitemap: z.union([z.literal(false), directusCollectionSitemapSchema]),
  prerender: z.union([z.literal(false), directusCollectionPrerenderSchema])
});

export type DirectusCollectionConfig = z.output<typeof directusCollectionConfigSchema>;

/** Serializable collection configuration accepted directly by the sitemap module. */
export const directusSitemapsCollectionConfigSchema = directusCollectionConfigSchema
  .omit({ sitemap: true })
  .extend({
    sitemap: z.union([
      z.literal(false),
      directusCollectionSitemapSchema.omit({ mapper: true, fetcher: true })
    ])
  });

/**
 * Directus Collection config schema
 */
export const directusCollectionSchema = z
  .array(directusCollectionConfigSchema)
  .default([])
  .sensitive();

export type DirectusCollectionOptions = z.input<typeof directusCollectionSchema>;
export type ResolvedDirectusCollectionOptions = z.output<typeof directusCollectionSchema>;
