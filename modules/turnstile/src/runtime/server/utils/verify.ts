import type { H3Event } from "h3";
import { useRuntimeConfig } from "#imports";
import { z } from "zod";

const turnstileValidationErrorCodeSchema = z.enum([
  "missing-input-secret",
  "invalid-input-secret",
  "missing-input-response",
  "invalid-input-response",
  "bad-request",
  "timeout-or-duplicate",
  "internal-error"
]);

const turnstileValidationResponseSchema = z.object({
  success: z.boolean(),
  hostname: z.string(),
  "error-codes": z.array(turnstileValidationErrorCodeSchema),

  challenge_ts: z.string().optional(),
  action: z.string().optional(),
  cdata: z.string().optional(),
  metadata: z.object({ result_with_testing_key: z.boolean().optional() }).optional()
});

export type TurnstileValidationResponse = z.infer<typeof turnstileValidationResponseSchema>;

const endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Turnstile token with the Cloudflare Turnstile API.
 * @param token - The Turnstile token to verify.
 * @param event - Optional H3 request event.
 * @param signal - Optional AbortSignal for request cancellation.
 * @returns The parsed Turnstile validation response.
 */
export const verifyTurnstileToken = async (
  token: string,
  event?: H3Event,
  signal?: AbortSignal
): Promise<TurnstileValidationResponse> => {
  const secretKey = useRuntimeConfig(event).turnstile.secretKey;
  const response = await $fetch(endpoint, {
    method: "POST",
    body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    signal
  });

  return turnstileValidationResponseSchema.parse(response);
};
