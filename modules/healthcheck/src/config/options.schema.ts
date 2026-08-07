import { z } from "zod";
import { enabled } from "module-utils/shared";

const nonEmptyString = z.string().trim().min(1);

const thresholdSchema = z
  .strictObject({
    warn: z.number().nonnegative().optional(),
    error: z.number().nonnegative().optional()
  })
  .superRefine((threshold, context) => {
    if (
      threshold.warn !== undefined &&
      threshold.error !== undefined &&
      threshold.error < threshold.warn
    ) {
      context.addIssue({
        code: "custom",
        path: ["error"],
        message: "must be greater than or equal to warn"
      });
    }
  });

const componentOptionsSchema = z.strictObject({
  enabled,
  threshold: thresholdSchema.optional()
});

const cloudinaryOptionsSchema = z.strictObject({
  enabled: z.boolean().default(false),
  cloudName: nonEmptyString.optional(),
  apiKey: nonEmptyString.optional(),
  apiSecret: nonEmptyString.optional(),
  threshold: thresholdSchema.optional()
});

const directusOptionsSchema = z.strictObject({
  enabled: z.boolean().default(false),
  baseUrl: z.url().optional(),
  threshold: thresholdSchema.optional()
});

/** Runtime validation shape for all public healthcheck module options. */
const healthcheckOptionsShape = {
  cache: componentOptionsSchema.optional(),
  cloudinary: cloudinaryOptionsSchema.optional(),
  directus: directusOptionsSchema.optional()
};

/** Runtime validation schema for all public healthcheck module options. */
export const healthcheckOptionsSchema = z.strictObject({
  enabled,
  ...healthcheckOptionsShape
});

export type HealthcheckOptionsSchema = typeof healthcheckOptionsSchema;
