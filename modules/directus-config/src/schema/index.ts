import { z } from "zod";
import { getPublicSchema } from "./sensitive";

export * from "./instance";
export * from "./commands";
export * from "./client";
export * from "./typegen";
export { getPublicSchema } from "./sensitive";
export { getResolvedDirectusConfig, setResolvedDirectusConfig } from "./resolved-config";

import { directusInstanceSchema } from "./instance";
import { directusClientSchema } from "./client";

/** Complete executable Directus configuration source schema. */
export const directusConfigSchema = z.strictObject({
  instance: directusInstanceSchema.optional(),
  client: directusClientSchema.optional()
});

/** Client-safe projection derived from fields marked as sensitive in the source schemas. */
export const directusPublicConfigSchema = getPublicSchema(directusConfigSchema);

/** Input type accepted by the complete shared Directus config schema. */
export type DirectusConfig = z.input<typeof directusConfigSchema>;
/** Resolved type produced by the complete shared Directus config schema. */
export type ResolvedDirectusConfig = z.output<typeof directusConfigSchema>;
