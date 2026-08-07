import { z } from "zod";

export const turnstileOptionsShape = {
  siteKey: z.string(),
  secretKey: z.string(),
  adminToken: z.string(),
  adminHeaderName: z.string().min(1)
};

export const turnstileOptionsSchema = z.object({
  enabled: z.boolean(),
  ...turnstileOptionsShape
});
