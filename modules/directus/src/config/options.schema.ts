import {
  directusClientSchema,
  directusConfigSchema,
  directusInstanceSchema
} from "@onderwijsin/nuxt-directus-config/schema";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";

/** Runtime boundary for Directus client module configuration. */
export const directusOptionsSchema = directusConfigSchema.safeExtend({
  enabled: enabled.default(true),
  instance: directusInstanceSchema.default({}),
  client: directusClientSchema.prefault({})
});

export type DirectusOptionsSchema = typeof directusOptionsSchema;
