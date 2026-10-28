import { createError, type H3Error } from "h3";
import { z } from "zod";

const authenticationCodeSchema = z.enum([
  "INVALID_OTP",
  "INVALID_CREDENTIALS",
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "FORBIDDEN",
  "REQUESTS_EXCEEDED"
]);
const authenticationMessages: Record<z.infer<typeof authenticationCodeSchema>, string> = {
  INVALID_OTP: "Invalid user OTP",
  INVALID_CREDENTIALS: "Invalid user credentials",
  INVALID_TOKEN: "Invalid token",
  TOKEN_EXPIRED: "Token expired",
  FORBIDDEN: "Forbidden",
  REQUESTS_EXCEEDED: "Too many requests"
};
const authenticationErrorSchema = z.object({
  statusCode: z.number().int().min(400).max(499),
  data: z.object({
    errors: z.array(z.object({ extensions: z.object({ code: authenticationCodeSchema }) })).min(1)
  })
});

/**
 * Maps expected upstream authentication failures to a controlled production HTTP response.
 *
 * Only recognized 4xx codes cross this boundary. Upstream messages, extensions and fetch details
 * are excluded; unexpected failures remain unhandled so production error redaction still applies.
 *
 * @param error - Untrusted failure from an upstream authentication request.
 * @returns A handled H3 error, or undefined when the failure must remain private.
 */
export function createDirectusAuthenticationError(error: unknown): H3Error | undefined {
  const result = authenticationErrorSchema.safeParse(error);
  if (!result.success) return undefined;
  return createError({
    statusCode: result.data.statusCode,
    statusMessage: "Authentication failed",
    data: {
      errors: result.data.data.errors.map(({ extensions: { code } }) => ({
        message: authenticationMessages[code],
        extensions: { code }
      }))
    }
  });
}
