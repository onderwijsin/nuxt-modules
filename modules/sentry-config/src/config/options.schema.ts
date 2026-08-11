import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

import { supportedSentryRuntimes } from "../types/options";

const testToolRouteSchema = z.union([
  z.literal(false),
  z.object({
    path: z.string().trim().min(1).startsWith("/").optional()
  })
]);

export const sentryConfigOptionsSchema = z.object({
  enabled,
  dsn: z.string().trim().min(1).optional(),
  runtime: z.enum(supportedSentryRuntimes).optional(),
  configFile: z.string().trim().min(1).optional(),
  autoInjectServerConfig: z.boolean().default(true),
  disableNitroSourceMapUpload: z.boolean().default(true),
  testTools: z
    .union([
      z.literal(false),
      z.object({
        page: testToolRouteSchema.optional(),
        endpoint: testToolRouteSchema.optional()
      })
    ])
    .default({})
});
