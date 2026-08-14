import { z } from "zod";

import { getPublicSchema } from "./sensitive";
import { directusInstanceSchema } from "./instance";
import { directusClientSchema } from "./client";
import { directusCollectionSchema } from "./collections";
import { directusSitemapsSchema } from "./sitemap";
import { directusPrerendererSchema } from "./prerenderer";

/** Complete executable Directus configuration source schema. */
export const directusConfigSchema = z.strictObject({
  instance: directusInstanceSchema.optional(),
  client: directusClientSchema.optional(),
  collections: directusCollectionSchema.optional(),
  sitemaps: directusSitemapsSchema.optional(),
  prerenderer: directusPrerendererSchema.optional()
});

/** Client-safe projection derived from fields marked as sensitive in the source schemas. */
export const directusPublicConfigSchema = getPublicSchema(directusConfigSchema);

/** Input type accepted by the complete shared Directus config schema. */
export type DirectusConfig = z.input<typeof directusConfigSchema>;
/** Resolved type produced by the complete shared Directus config schema. */
export type ResolvedDirectusConfig = z.output<typeof directusConfigSchema>;
