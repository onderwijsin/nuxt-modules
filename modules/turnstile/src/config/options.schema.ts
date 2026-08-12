import { z } from "zod";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";

export const turnstileOptionsSchema = z.object({
  enabled,
  siteKey: z.string().default(""),
  secretKey: z.string().default(""),
  adminToken: z.string().default(""),
  adminHeaderName: z.string().min(1).default("x-admin-token")
});

export type ModuleOptions = z.input<typeof turnstileOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof turnstileOptionsSchema>;
