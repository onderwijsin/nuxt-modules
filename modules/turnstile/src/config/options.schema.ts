import { z } from "zod";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";

export const turnstileOptionsSchema = z.object({
  enabled,
  siteKey: z.string(),
  secretKey: z.string(),
  adminToken: z.string(),
  adminHeaderName: z.string().min(1)
});
