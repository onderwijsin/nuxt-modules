import { z } from "zod";

const field = z.object({
  target: z.string().trim().min(1).optional(),
  required: z.boolean().optional()
});

const endpoint = z.object({
  enabled: z.boolean().optional(),
  url: z
    .string()
    .trim()
    .min(1)
    .refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), {
      error: "must be a relative path or an HTTP(S) URL"
    })
    .optional()
});

export const newsletterSignupOptionsShape = {
  provider: z.enum(["loops", "mailchimp"]).optional(),
  apiKey: z.string().optional(),
  endpoint: endpoint.optional(),
  server: z.string().trim().min(1).optional(),
  lists: z
    .object({
      default: z.string().trim().min(1).optional(),
      options: z
        .array(
          z.object({
            label: z.string().trim().min(1),
            id: z.string().trim().min(1),
            server: z.string().trim().min(1).optional()
          })
        )
        .min(1)
        .optional()
    })
    .optional(),
  fields: z
    .object({
      email: field.optional(),
      firstName: field.optional(),
      lastName: field.optional(),
      organization: field.optional(),
      source: field.optional()
    })
    .optional()
};
