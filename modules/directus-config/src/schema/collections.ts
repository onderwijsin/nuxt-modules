import { isFunction } from "@onderwijsin/nuxt-module-utils/shared";
import { z } from "zod";

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

const priorities = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const;

/** Normalized result returned by a sitemap collection mapper. */
export const directusSitemapEntrySchema = z.strictObject({
  path: z.string().trim().startsWith("/"),
  lastUpdated: z.string().optional(),
  noIndex: z.boolean().optional(),
  priority: z.literal(priorities).optional()
});

export type DirectusCollectionFetchContext = z.output<typeof directusCollectionFetchContextSchema>;
export type DirectusSitemapEntry = z.output<typeof directusSitemapEntrySchema>;
export type DirectusCollectionFetcher<Item = unknown> = (
  context: DirectusCollectionFetchContext
) => Promise<readonly Item[]>;
export type DirectusCollectionMapper<Item = unknown, Result = unknown> = (
  item: Item
) => Result | Result[] | null | undefined;

const directusCollectionSitemapSchema = z.strictObject({
  fields: fields.optional(),
  filter: filter.optional(),
  mapper: z.custom<DirectusCollectionMapper>((value) => isFunction(value), "must be a function"),
  fetcher: z
    .custom<DirectusCollectionFetcher>((value) => isFunction(value), "must be a function")
    .optional()
});

/** Portable executable Directus collection configuration. */
export const directusCollectionConfigSchema = z.strictObject({
  collection,
  sitemap: z.union([z.literal(false), directusCollectionSitemapSchema]),
  // For future feature
  prerender: z.union([z.literal(false), z.strictObject({})])
});

export type DirectusCollectionConfig = z.output<typeof directusCollectionConfigSchema>;

/**
 * Directus Collection config schema
 */
export const directusCollectionSchema = z.strictObject({
  collections: z.array(directusCollectionConfigSchema).default([]).sensitive()
});

export type DirectusCollectionOptions = z.input<typeof directusCollectionSchema>;
export type ResolvedDirectusCollectionOptions = z.output<typeof directusCollectionSchema>;
