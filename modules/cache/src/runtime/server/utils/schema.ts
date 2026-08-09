import { z } from "zod";

const cacheBaseSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*:[a-zA-Z0-9][a-zA-Z0-9._-]*$/);

const cachePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(2_048)
  .refine((path) => path.startsWith("/"), {
    message: "must start with /"
  });

/** Validates the public targeted cache-invalidation request. */
export const invalidateCacheSchema = z.strictObject({
  targets: z
    .array(
      z.strictObject({
        base: cacheBaseSchema,
        path: cachePathSchema,
        match: z.enum(["exact", "prefix"]).default("exact")
      })
    )
    .min(1)
    .max(100)
});
