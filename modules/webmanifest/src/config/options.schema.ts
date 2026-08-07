import { z } from "zod";

/** Runtime validation shape for webmanifest module options. */
export const moduleOptionsShape = {
  icons: z
    .object({
      favicon: z.string().trim().min(1).optional(),
      appIcon: z.string().trim().min(1).optional(),
      maskableAppIcon: z.string().trim().min(1).optional()
    })
    .optional(),
  manifest: z.record(z.string(), z.unknown()).optional()
};
