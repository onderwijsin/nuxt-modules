import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

/** Runtime boundary for directus-config module setup options. */
export const directusConfigOptionsSchema = z.strictObject({
  enabled: enabled.default(true),
  configFile: z.union([z.string().trim().min(1), z.literal(false)]).default("directus.config.ts")
});

export type ModuleOptions = z.input<typeof directusConfigOptionsSchema>;
