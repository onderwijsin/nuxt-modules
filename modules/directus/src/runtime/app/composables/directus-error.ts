import { isArray, isInteger, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

/** Documented Directus core error codes plus an open extension-code escape hatch. */
export type DirectusErrorCode =
  | "INVALID_CREDENTIALS"
  | "INVALID_OTP"
  | "TOKEN_EXPIRED"
  | "INVALID_TOKEN"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "REQUIRES_2FA"
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
  readonly invalidCredentials: boolean;
  readonly tokenExpired: boolean;
}

export interface NormalizedUnknownError {
  readonly isDirectusError: false;
  readonly errors: readonly [];
  readonly statusCode?: number;
  readonly isOtpError: false;
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
  if (isRecord(error)) candidates.push(error.data, error.response);
  for (const candidate of candidates) {
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
    invalidCredentials: errors.some((entry) => entry.code === "INVALID_CREDENTIALS"),
    tokenExpired: errors.some(
      (entry) => entry.code === "TOKEN_EXPIRED" || entry.code === "INVALID_TOKEN"
    )
  };
}
