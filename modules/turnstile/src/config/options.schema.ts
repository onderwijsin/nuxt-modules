import { z } from "zod";
import { enabled } from "module-utils/shared";

export const turnstileOptionsSchema = z.object({
  enabled,
  siteKey: z.string(),
  secretKey: z.string(),
  adminToken: z.string(),
  adminHeaderName: z.string().min(1)
});
