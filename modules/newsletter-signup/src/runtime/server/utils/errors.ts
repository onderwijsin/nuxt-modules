import { createError } from "h3";
import { hasKey, isNumber, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";
import type { NewsletterSignupErrorCode, NewsletterSignupErrorData } from "../../types/errors";

/**
 * Creates the stable serializable error returned by the signup endpoint.
 * @param statusCode - HTTP status exposed to the client.
 * @param code - Stable public error code.
 * @param cause - Original provider or validation error.
 * @param bannedUntil - Unix-millisecond expiry when the client is temporarily banned.
 * @returns H3-compatible error.
 */
export function createNewsletterSignupError(
  statusCode: number,
  code: NewsletterSignupErrorCode,
  cause?: unknown,
  bannedUntil?: number
): Error {
  const data: NewsletterSignupErrorData = {
    code,
    httpStatusCode: statusCode,
    ...(bannedUntil === undefined ? {} : { bannedUntil })
  };
  return createError({
    statusCode,
    statusMessage: code,
    data,
    cause
  });
}

/**
 * Reads an upstream HTTP status from an unknown ofetch error.
 * @param error - Unknown caught error.
 * @returns HTTP status when available.
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  if (hasKey(error, "status") && isNumber(error.status)) return error.status;
  if (hasKey(error, "statusCode") && isNumber(error.statusCode)) return error.statusCode;
  return undefined;
}

/**
 * Reads a provider response body from an unknown ofetch error.
 * @param error - Unknown caught error.
 * @returns Object-shaped provider data when available.
 */
export function getErrorData(error: unknown): Record<string, unknown> | undefined {
  if (!isRecord(error)) return undefined;
  if (!hasKey(error, "data")) return undefined;
  const data = error.data;
  if (isString(data)) {
    try {
      const parsed: unknown = JSON.parse(data);
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return isRecord(data) ? data : undefined;
}
