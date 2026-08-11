import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

import { supportedSentryRuntimes } from "../types/options";

export const sentryConfigOptionsSchema = z.object({
  enabled,
  dsn: z.string().trim().min(1).optional(),
  runtime: z.enum(supportedSentryRuntimes).optional(),
  configFile: z.string().trim().min(1).optional(),
  autoInjectServerConfig: z.boolean().default(true),
  disableNitroSourceMapUpload: z.boolean().default(true)
});
