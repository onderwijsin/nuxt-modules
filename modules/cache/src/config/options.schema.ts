import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

/** Runtime validation schema for the public cache module options. */
export const cacheOptionsSchema = z.strictObject({
  enabled: enabled.default(false),
  adminToken: z.string().trim().min(1).optional(),
  adminHeaderName: z.string().trim().min(1).default("x-admin-token"),
  devAuthBypass: z.boolean().default(false),
  maxInvalidatedEntries: z.number().int().positive().max(10_000).default(1_000)
});

export type ModuleOptions = z.input<typeof cacheOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof cacheOptionsSchema>;
