import { isArray, isInteger, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

/** Common Directus error codes that are useful when presenting UI feedback. */
export type DirectusErrorCode =
  | "INVALID_CREDENTIALS"
  | "INVALID_OTP"
  | "TOKEN_EXPIRED"
  | "INVALID_TOKEN"
  | "FORBIDDEN"
  | "FAILED_VALIDATION"
  | "INVALID_PAYLOAD"
  | "INVALID_QUERY"
  | "REQUESTS_EXCEEDED"
  | "ROUTE_NOT_FOUND"
  | "SERVICE_UNAVAILABLE"
  | "UNPROCESSABLE_CONTENT"
  | (string & {});

/** Safe contextual values attached to a Directus error. */
export interface DirectusErrorExtensions {
  readonly code: DirectusErrorCode;
  readonly collection?: string;
  readonly field?: string;
  readonly value?: unknown;
  readonly reason?: string;
  readonly path?: string;
  readonly stack?: string;
  readonly [key: string]: unknown;
}

export interface NormalizedDirectusError {
  readonly isDirectusError: true;
  readonly errors: readonly {
    readonly message: string;
    readonly code: DirectusErrorCode;
    readonly extensions: DirectusErrorExtensions;
  }[];
  readonly statusCode?: number;
  readonly isOtpError: boolean;
  readonly isInvalidCredentialError: boolean;
  readonly isForbiddenError: boolean;
  readonly isTokenExpiredError: boolean;
  readonly isInvalidTokenError: boolean;
  readonly isValidationError: boolean;
  readonly isRateLimitError: boolean;
  readonly isServiceUnavailableError: boolean;
  readonly isRouteNotFoundError: boolean;
  readonly invalidCredentials: boolean;
  readonly tokenExpired: boolean;
}

export interface NormalizedUnknownError {
  readonly isDirectusError: false;
  readonly errors: readonly [];
  readonly statusCode?: number;
  readonly isOtpError: false;
  readonly isInvalidCredentialError: false;
  readonly isForbiddenError: false;
  readonly isTokenExpiredError: false;
  readonly isInvalidTokenError: false;
  readonly isValidationError: false;
  readonly isRateLimitError: false;
  readonly isServiceUnavailableError: false;
  readonly isRouteNotFoundError: false;
  readonly invalidCredentials: false;
  readonly tokenExpired: false;
}

export type DirectusErrorResult = NormalizedDirectusError | NormalizedUnknownError;

function getEnvelope(value: unknown): readonly unknown[] | undefined {
  if (!isRecord(value) || !isArray(value.errors)) return undefined;
  return value.errors;
}

function findEnvelope(
  error: unknown
): { errors: readonly unknown[]; statusCode?: number } | undefined {
  const candidates: unknown[] = [error];
  const seen = new Set<object>();
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (isRecord(candidate)) {
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      candidates.push(candidate.data, candidate.response);
    }
    const errors = getEnvelope(candidate);
    if (errors) {
      const statusCode =
        (isRecord(error) && isInteger(error.statusCode) ? error.statusCode : undefined) ??
        (isRecord(candidate) && isInteger(candidate.statusCode) ? candidate.statusCode : undefined);
      return { errors, statusCode };
    }
  }
  return undefined;
}

/** Normalizes SDK, ofetch, H3, malformed, and extension-defined Directus errors safely.
 * @param error Unknown thrown value.
 * @returns A stable normalized error result.
 */
export function useDirectusError(error: unknown): DirectusErrorResult {
  const envelope = findEnvelope(error);
  if (!envelope) {
    return {
      isDirectusError: false,
      errors: [],
      ...(isRecord(error) && isInteger(error.statusCode) ? { statusCode: error.statusCode } : {}),
      isOtpError: false,
      isInvalidCredentialError: false,
      isForbiddenError: false,
      isTokenExpiredError: false,
      isInvalidTokenError: false,
      isValidationError: false,
      isRateLimitError: false,
      isServiceUnavailableError: false,
      isRouteNotFoundError: false,
      invalidCredentials: false,
      tokenExpired: false
    };
  }

  const errors = envelope.errors.flatMap((entry) => {
    if (!isRecord(entry) || !isString(entry.message) || !isRecord(entry.extensions)) return [];
    const code = isString(entry.extensions.code) ? entry.extensions.code : "UNKNOWN";
    return [{ message: entry.message, code, extensions: { ...entry.extensions, code } }];
  });
  return {
    isDirectusError: true,
    errors,
    ...(envelope.statusCode === undefined ? {} : { statusCode: envelope.statusCode }),
    isOtpError: errors.some((entry) => entry.code === "INVALID_OTP"),
    isInvalidCredentialError: errors.some((entry) => entry.code === "INVALID_CREDENTIALS"),
    isForbiddenError: errors.some((entry) => entry.code === "FORBIDDEN"),
    isTokenExpiredError: errors.some((entry) => entry.code === "TOKEN_EXPIRED"),
    isInvalidTokenError: errors.some((entry) => entry.code === "INVALID_TOKEN"),
    isValidationError: errors.some((entry) =>
      ["FAILED_VALIDATION", "INVALID_PAYLOAD", "INVALID_QUERY", "UNPROCESSABLE_CONTENT"].includes(
        entry.code
      )
    ),
    isRateLimitError: errors.some((entry) => entry.code === "REQUESTS_EXCEEDED"),
    isServiceUnavailableError: errors.some((entry) => entry.code === "SERVICE_UNAVAILABLE"),
    isRouteNotFoundError: errors.some((entry) => entry.code === "ROUTE_NOT_FOUND"),
    invalidCredentials: errors.some((entry) => entry.code === "INVALID_CREDENTIALS"),
    tokenExpired: errors.some((entry) => entry.code === "TOKEN_EXPIRED")
  };
}
