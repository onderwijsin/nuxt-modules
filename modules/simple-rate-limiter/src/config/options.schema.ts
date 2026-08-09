import { z } from "zod";

/** Runtime validation schema for the simple rate limiter module options. */
export const simpleRateLimiterOptionsSchema = z.strictObject({
  global: z
    .strictObject({
      enabled: z.boolean().optional(),
      pruning: z
        .strictObject({
          enabled: z.boolean().optional(),
          cron: z.string().trim().min(1).optional(),
          staleAfter: z.number().int().positive().optional()
        })
        .optional()
    })
    .optional()
});
