import { z } from "zod";

/** Runtime validation schema for the simple rate limiter module options. */
export const simpleRateLimiterOptionsSchema = z.strictObject({
  enabled: z.boolean().optional(),
  global: z
    .strictObject({
      enabled: z.boolean().optional(),
      pruning: z
        .strictObject({
          enabled: z.boolean().optional(),
          staleAfter: z.number().int().positive().optional()
        })
        .optional()
    })
    .optional()
});

export type ModuleOptions = z.input<typeof simpleRateLimiterOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof simpleRateLimiterOptionsSchema>;
