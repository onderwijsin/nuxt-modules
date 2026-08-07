import { createError } from "h3";
import type { NewsletterSignupErrorCode, NewsletterSignupErrorData } from "../../types/errors";
import { isRecord } from "../../shared";

/**
 * Creates the stable serializable error returned by the signup endpoint.
 * @param statusCode - HTTP status exposed to the client.
 * @param code - Stable public error code.
 * @param cause - Original provider or validation error.
 * @returns H3-compatible error.
 */
export function createNewsletterSignupError(
  statusCode: number,
  code: NewsletterSignupErrorCode,
  cause?: unknown
): Error {
  const data: NewsletterSignupErrorData = { code, httpStatusCode: statusCode };
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
  const status = error.status;
  const statusCode = error.statusCode;
  return typeof status === "number"
    ? status
    : typeof statusCode === "number"
      ? statusCode
      : undefined;
}

/**
 * Reads a provider response body from an unknown ofetch error.
 * @param error - Unknown caught error.
 * @returns Object-shaped provider data when available.
 */
export function getErrorData(error: unknown): Record<string, unknown> | undefined {
  if (!isRecord(error)) return undefined;
  const data = error.data;
  if (typeof data === "string") {
    try {
      const parsed: unknown = JSON.parse(data);
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return isRecord(data) ? data : undefined;
}
