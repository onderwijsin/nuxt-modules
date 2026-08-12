import {
  directusClientSchema,
  directusConfigSchema,
  directusInstanceSchema
} from "@onderwijsin/nuxt-directus-config/schema";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

/** Runtime boundary for Directus client module configuration. */
export const directusClientOptionsSchema = directusConfigSchema.safeExtend({
  enabled: enabled.default(true),
  instance: directusInstanceSchema.default({}),
  client: directusClientSchema.prefault({})
});

export type DirectusClientOptionsSchema = typeof directusClientOptionsSchema;
export type ModuleOptions = z.input<typeof directusClientOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof directusClientOptionsSchema>;
