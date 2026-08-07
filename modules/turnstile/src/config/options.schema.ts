import { z } from "zod";

export const turnstileOptionsSchema = z.object({
  enabled: z.boolean(),
  siteKey: z.string(),
  secretKey: z.string(),
  adminToken: z.string(),
  adminHeaderName: z.string().min(1)
});
