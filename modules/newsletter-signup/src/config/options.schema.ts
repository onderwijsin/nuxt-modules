import { z } from "zod";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";

export const newsletterFieldSchema = z.object({
  target: z.string().trim().min(1).optional(),
  required: z.boolean().optional()
});

export const newsletterEndpointSchema = z.object({
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

export const newsletterListSchema = z.object({
  label: z.string().trim().min(1),
  id: z.string().trim().min(1)
});

export const mailchimpServerSchema = z
  .string()
  .regex(/^us\d+$/, { error: "must be a Mailchimp server prefix such as us21" });

const commonOptionsShape = {
  enabled,
  apiKey: z.string().optional(),
  endpoint: newsletterEndpointSchema.optional(),
  fields: z
    .object({
      email: newsletterFieldSchema.optional(),
      firstName: newsletterFieldSchema.optional(),
      lastName: newsletterFieldSchema.optional(),
      organization: newsletterFieldSchema.optional(),
      source: newsletterFieldSchema.optional()
    })
    .optional()
};

const loopsOptionsSchema = z.strictObject({
  ...commonOptionsShape,
  provider: z.literal("loops"),
  lists: z
    .object({
      default: z.string().trim().min(1).optional(),
      options: z.array(newsletterListSchema).min(1).optional()
    })
    .optional()
});

const mailchimpOptionsSchema = z.strictObject({
  ...commonOptionsShape,
  provider: z.literal("mailchimp"),
  server: mailchimpServerSchema.optional(),
  lists: z
    .object({
      default: z.string().trim().min(1).optional(),
      options: z
        .array(
          newsletterListSchema.extend({
            server: mailchimpServerSchema
          })
        )
        .min(1)
        .optional()
    })
    .optional()
});

const providerOptionsSchema = z.discriminatedUnion("provider", [
  loopsOptionsSchema,
  mailchimpOptionsSchema
]);

const noProviderOptionsSchema = z.strictObject({
  ...commonOptionsShape,
  provider: z.undefined().optional(),
  lists: z
    .object({
      default: z.string().trim().min(1).optional(),
      options: z.array(newsletterListSchema).min(1).optional()
    })
    .optional()
});

export const newsletterSignupOptionsSchema = z.union([
  providerOptionsSchema,
  noProviderOptionsSchema
]);

/** Ergonomic consumer input shape accepted before provider-specific validation. */
export const newsletterSignupModuleOptionsSchema = z.strictObject({
  ...commonOptionsShape,
  provider: z.enum(["loops", "mailchimp"]).optional(),
  server: mailchimpServerSchema.optional(),
  lists: z
    .object({
      default: z.string().trim().min(1).optional(),
      options: z
        .array(newsletterListSchema.extend({ server: mailchimpServerSchema.optional() }))
        .min(1)
        .optional()
    })
    .optional()
});

export type NewsletterProvider = "loops" | "mailchimp";
export type NewsletterListOption = z.infer<typeof newsletterListSchema>;
export type NewsletterFieldConfig = z.infer<typeof newsletterFieldSchema>;
export type NewsletterEndpointConfig = z.infer<typeof newsletterEndpointSchema>;
export type ModuleOptions = z.input<typeof newsletterSignupModuleOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof newsletterSignupOptionsSchema>;
