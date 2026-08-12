import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

export const supportedSentryRuntimes = ["node-server", "cloudflare_module"] as const;

export const sentryTestToolRouteSchema = z.union([
  z.literal(false),
  z.object({
    path: z.string().trim().min(1).startsWith("/").optional()
  })
]);

export const sentryTestToolsObjectSchema = z.object({
  page: sentryTestToolRouteSchema.optional(),
  endpoint: sentryTestToolRouteSchema.optional()
});

export const sentryConfigOptionsSchema = z.object({
  enabled,
  dsn: z.string().trim().min(1).optional(),
  runtime: z.enum(supportedSentryRuntimes).optional(),
  configFile: z.string().trim().min(1).optional(),
  autoInjectServerConfig: z.boolean().default(true),
  disableNitroSourceMapUpload: z.boolean().default(true),
  testTools: z.union([z.literal(false), sentryTestToolsObjectSchema]).default({})
});

export type SentryRuntime = (typeof supportedSentryRuntimes)[number];
export type SentryTestToolRouteOptions = z.infer<typeof sentryTestToolRouteSchema>;
export type SentryTestToolsOptions = z.infer<typeof sentryTestToolsObjectSchema>;
export type ModuleOptions = z.input<typeof sentryConfigOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof sentryConfigOptionsSchema>;
