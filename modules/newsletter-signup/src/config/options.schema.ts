import { z } from "zod";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";

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

const list = z.object({
  label: z.string().trim().min(1),
  id: z.string().trim().min(1)
});

const mailchimpServer = z
  .string()
  .regex(/^us\d+$/, { error: "must be a Mailchimp server prefix such as us21" });

const commonOptionsShape = {
  enabled,
  apiKey: z.string().optional(),
  endpoint: endpoint.optional(),
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

const loopsOptionsSchema = z.strictObject({
  ...commonOptionsShape,
  provider: z.literal("loops"),
  lists: z
    .object({
      default: z.string().trim().min(1).optional(),
      options: z.array(list).min(1).optional()
    })
    .optional()
});

const mailchimpOptionsSchema = z.strictObject({
  ...commonOptionsShape,
  provider: z.literal("mailchimp"),
  server: mailchimpServer.optional(),
  lists: z
    .object({
      default: z.string().trim().min(1).optional(),
      options: z
        .array(
          list.extend({
            server: mailchimpServer
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
      options: z.array(list).min(1).optional()
    })
    .optional()
});

export const newsletterSignupOptionsSchema = z.union([
  providerOptionsSchema,
  noProviderOptionsSchema
]);
