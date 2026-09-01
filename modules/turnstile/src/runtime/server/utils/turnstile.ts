import type { H3Event } from "h3";
import { createError, getRequestHeader } from "h3";
import { useRuntimeConfig } from "#imports";
import { isAdmin } from "@onderwijsin/nuxt-module-utils/server";
import { attempt, hasKey, isNumber, isRecord } from "@onderwijsin/nuxt-module-utils/shared";
import { z } from "zod";
import type { TurnstileErrorCode, TurnstileErrorData } from "../../types/errors";
import { TURNSTILE_TOKEN_HEADER } from "../../constants";
import { verifyTurnstileToken } from "./verify";

const turnstileVerificationSchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  metadata: z.object({ result_with_testing_key: z.boolean().optional() }).optional()
});

/**
 * Validates the Turnstile token from a protected request.
 * @param event - H3 request event.
 * @param expectedAction - Action expected from the Turnstile response.
 * @returns Resolves when the token is valid.
 */
export async function assertTurnstileToken(event: H3Event, expectedAction: string): Promise<void> {
  const config = useRuntimeConfig(event);
  const turnstileConfig = config.turnstile;
  if (
    isAdmin(event, turnstileConfig?.adminToken, turnstileConfig?.adminHeaderName ?? "x-admin-token")
  )
    return;

  const secretKey = turnstileConfig?.secretKey?.trim();
  if (!secretKey) {
    if (!import.meta.dev)
      throw createTurnstileError(
        500,
        "Turnstile secret key is missing",
        "TURNSTILE_SERVER_MISCONFIGURED",
        expectedAction
      );
    return;
  }

  const token = getRequestHeader(event, TURNSTILE_TOKEN_HEADER)?.trim();
  if (!token)
    throw createTurnstileError(
      400,
      "Turnstile token is missing",
      "TURNSTILE_TOKEN_MISSING",
      expectedAction
    );

  const result = await attempt(() => verifyTurnstileToken(token));
  if (result.error !== null) {
    if (isErrorWithStatusCode(result.error)) throw result.error;
    throw createError({
      statusCode: 502,
      statusMessage: "Turnstile validation could not be performed",
      data: createTurnstileErrorData("TURNSTILE_VALIDATION_UNAVAILABLE", expectedAction),
      cause: result.error
    });
  }
  const verificationResult = turnstileVerificationSchema.safeParse(result.data);
  if (!verificationResult.success)
    throw createError({
      statusCode: 502,
      statusMessage: "Turnstile validation returned an invalid response",
      data: createTurnstileErrorData("TURNSTILE_VALIDATION_UNAVAILABLE", expectedAction),
      cause: verificationResult.error
    });
  const verification = verificationResult.data;
  if (!verification.success)
    throw createTurnstileError(
      403,
      "Turnstile validation failed",
      "TURNSTILE_VALIDATION_FAILED",
      expectedAction
    );
  if (!verification.metadata?.result_with_testing_key && verification.action !== expectedAction)
    throw createTurnstileError(
      403,
      "Turnstile action does not match",
      "TURNSTILE_ACTION_MISMATCH",
      expectedAction
    );
}

/** Creates a stable H3 error for Turnstile failures.
 * @param statusCode - HTTP status code.
 * @param statusMessage - Human-readable status message.
 * @param code - Stable Turnstile error code.
 * @param expectedAction - Optional expected action.
 * @returns An H3 error with normalized Turnstile data.
 */
export function createTurnstileError(
  statusCode: number,
  statusMessage: string,
  code: TurnstileErrorCode,
  expectedAction?: string
): Error {
  return createError({
    statusCode,
    statusMessage,
    data: createTurnstileErrorData(code, expectedAction)
  });
}

/**
 * Creates the serializable Turnstile error payload.
 * @param code - Stable Turnstile error code.
 * @param expectedAction - Optional expected action.
 * @returns Serializable error data.
 */
export function createTurnstileErrorData(
  code: TurnstileErrorCode,
  expectedAction?: string
): TurnstileErrorData {
  return expectedAction ? { code, expectedAction } : { code };
}

/**
 * Narrows unknown exceptions to errors carrying an HTTP status code.
 * @param error - Unknown exception.
 * @returns Whether the exception has a numeric status code.
 */
export function isErrorWithStatusCode(error: unknown): error is { statusCode: number } {
  return isRecord(error) && hasKey(error, "statusCode") && isNumber(error.statusCode);
}
