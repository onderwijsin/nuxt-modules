import { z } from "zod";

/** Stable error categories returned by the signup endpoint. */
export const NEWSLETTER_SIGNUP_ERROR_CODES: {
  readonly invalidInput: "NEWSLETTER_SIGNUP_INVALID_INPUT";
  readonly server: "NEWSLETTER_SIGNUP_SERVER_ERROR";
  readonly configuration: "NEWSLETTER_SIGNUP_CONFIGURATION_ERROR";
  readonly provider: "NEWSLETTER_SIGNUP_PROVIDER_ERROR";
} = {
  invalidInput: "NEWSLETTER_SIGNUP_INVALID_INPUT",
  server: "NEWSLETTER_SIGNUP_SERVER_ERROR",
  configuration: "NEWSLETTER_SIGNUP_CONFIGURATION_ERROR",
  provider: "NEWSLETTER_SIGNUP_PROVIDER_ERROR"
};

/** Short public alias for consumers that prefer `ERROR_CODES.invalidInput`. */
export const ERROR_CODES = NEWSLETTER_SIGNUP_ERROR_CODES;

export const newsletterSignupErrorCodeSchema = z.enum([
  "NEWSLETTER_SIGNUP_INVALID_INPUT",
  "NEWSLETTER_SIGNUP_SERVER_ERROR",
  "NEWSLETTER_SIGNUP_CONFIGURATION_ERROR",
  "NEWSLETTER_SIGNUP_PROVIDER_ERROR"
]);

export const newsletterSignupErrorDataSchema = z.object({
  code: newsletterSignupErrorCodeSchema,
  httpStatusCode: z.number().int()
});

export type NewsletterSignupErrorCode = z.infer<typeof newsletterSignupErrorCodeSchema>;
export type NewsletterSignupErrorData = z.infer<typeof newsletterSignupErrorDataSchema>;
