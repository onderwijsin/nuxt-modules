import { z } from "zod";
import { enabled } from "@onderwijsin/nuxt-module-utils/shared";

/** Runtime validation schema for webmanifest module options. */
export const webmanifestOptionsSchema = z.strictObject({
  enabled,
  icons: z
    .object({
      favicon: z.string().trim().min(1).optional(),
      appIcon: z.string().trim().min(1).optional(),
      maskableAppIcon: z.string().trim().min(1).optional()
    })
    .optional(),
  manifest: z.record(z.string(), z.unknown()).optional()
});
