import { isArray, isInteger, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";
import {
  normalizedErrorFlagDefaults,
  type DirectusErrorExtensions,
  type DirectusErrorResult,
  type NitroErrorCode,
  type NormalizedErrorCode,
  type NormalizedErrorEntry,
  type NormalizedNitroError
} from "./types";

/**
 * Extending the error handling:
 *
 * - add upstream codes to `DirectusErrorCode` and map their UI flags in
 * `useDirectusError`;
 *
 * - add local H3/Zod validation codes to `NitroErrorCode`, map their fields in
 * `nitroErrorCodeByField`, and set any new flags in `normalizedErrorFlagDefaults` plus the Nitro
 * normalization branch.
 *
 * - Keep Directus and Nitro envelopes separate, preserve only safe validator
 * metadata in extensions, add focused normalizer tests, update the playground error scenarios, and
 * document every consumer-visible code or flag in the decision record and package docs.
 */

/** A nested error or validation envelope discovered in a thrown value. */
interface LocatedEntries {
  readonly entries: readonly unknown[];
  readonly statusCode?: number;
}

/**
 * Reads a numeric HTTP status code from an unknown value.
 * @param value Candidate error-like value.
 * @returns The status code when present and valid.
 */
function getStatusCode(value: unknown): number | undefined {
  return isRecord(value) && isInteger(value.statusCode) ? value.statusCode : undefined;
}

/**
 * Finds an array property in an error, including common nested response containers.
 * @param error Unknown thrown value.
 * @param key Array property to locate.
 * @returns The discovered entries and status code, or undefined.
 */
function findNestedEntries(error: unknown, key: "errors" | "issues"): LocatedEntries | undefined {
  const candidates: unknown[] = [error];
  const seen = new Set<object>();
  const rootStatusCode = getStatusCode(error);

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (!isRecord(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);

    const entries = candidate[key];
    if (isArray(entries)) {
      const statusCode = rootStatusCode ?? getStatusCode(candidate);
      return { entries, ...(statusCode === undefined ? {} : { statusCode }) };
    }

    candidates.push(candidate.data, candidate.response);
  }

  return undefined;
}

/**
 * Returns the first field referenced by a validation issue.
 * @param issue Validation issue.
 * @returns The field name when available.
 */
function getIssueField(issue: Record<string, unknown>): string | undefined {
  if (!isArray(issue.path)) return undefined;
  const field = issue.path[0];
  return isString(field) ? field : undefined;
}

/** Maps auth input fields to their corresponding normalized Nitro error codes. */
const nitroErrorCodeByField: Record<string, NitroErrorCode> = {
  email: "INVALID_EMAIL_INPUT",
  password: "INVALID_PASSWORD_INPUT",
  otp: "INVALID_OTP_INPUT",
  token: "INVALID_PASSWORD_RESET_TOKEN_INPUT",
  magicLinkToken: "INVALID_MAGIC_LINK_TOKEN_INPUT"
};

/**
 * Maps a validation field to a Nitro error code.
 * @param field Invalid input field.
 * @returns The corresponding Nitro error code.
 */
function getNitroErrorCode(field: string | undefined): NitroErrorCode {
  return (field && nitroErrorCodeByField[field]) || "INVALID_AUTH_INPUT";
}

/**
 * Builds normalized extensions for a Nitro validation issue.
 * @param code Normalized Nitro error code.
 * @param field Invalid field, when known.
 * @param issue Original validation issue.
 * @returns Safe normalized error extensions.
 */
function createNitroErrorExtensions(
  code: NitroErrorCode,
  field: string | undefined,
  issue: Record<string, unknown>
): DirectusErrorExtensions<NitroErrorCode> {
  return {
    code,
    ...(field ? { field } : {}),
    ...(isString(issue.code) ? { reason: issue.code } : {}),
    ...(isInteger(issue.maximum) ? { maximum: issue.maximum } : {}),
    ...(isInteger(issue.minimum) ? { minimum: issue.minimum } : {}),
    ...(typeof issue.inclusive === "boolean" ? { inclusive: issue.inclusive } : {})
  };
}

/**
 * Checks whether normalized errors contain at least one requested code.
 * @param errors Normalized error entries.
 * @param codes Error codes to match.
 * @returns Whether one of the requested codes is present.
 */
function hasErrorCode(
  errors: readonly NormalizedErrorEntry[],
  ...codes: readonly NormalizedErrorCode[]
): boolean {
  return errors.some((error) => codes.some((code) => error.code === code));
}

/**
 * Normalizes Nitro validation issues.
 * @param envelope Located validation issues.
 * @returns A normalized Nitro error when at least one valid issue exists.
 */
function normalizeNitroError(envelope: LocatedEntries): NormalizedNitroError | undefined {
  const errors: NormalizedErrorEntry<NitroErrorCode>[] = envelope.entries.flatMap((entry) => {
    if (!isRecord(entry) || !isString(entry.message)) return [];
    const field = getIssueField(entry);
    const code = getNitroErrorCode(field);
    return [
      { message: entry.message, code, extensions: createNitroErrorExtensions(code, field, entry) }
    ];
  });

  if (errors.length === 0) return undefined;

  return {
    ...normalizedErrorFlagDefaults,
    isNitroError: true,
    isValidationError: true,
    isInvalidAuthInput: true,
    isInvalidEmailInput: hasErrorCode(errors, "INVALID_EMAIL_INPUT"),
    isInvalidPasswordInput: hasErrorCode(errors, "INVALID_PASSWORD_INPUT"),
    isInvalidOtpInput: hasErrorCode(errors, "INVALID_OTP_INPUT"),
    isInvalidPasswordResetTokenInput: hasErrorCode(errors, "INVALID_PASSWORD_RESET_TOKEN_INPUT"),
    isInvalidMagicLinkTokenInput: hasErrorCode(errors, "INVALID_MAGIC_LINK_TOKEN_INPUT"),
    errors,
    ...(envelope.statusCode === undefined ? {} : { statusCode: envelope.statusCode })
  };
}

/**
 * Normalizes Directus error envelope entries.
 * @param entries Unknown Directus error entries.
 * @returns Valid normalized Directus errors.
 */
function normalizeDirectusEntries(
  entries: readonly unknown[]
): readonly NormalizedErrorEntry<NormalizedErrorCode>[] {
  return entries.flatMap((entry) => {
    if (!isRecord(entry) || !isString(entry.message) || !isRecord(entry.extensions)) return [];
    const code = isString(entry.extensions.code) ? entry.extensions.code : "UNKNOWN";
    return [{ message: entry.message, code, extensions: { ...entry.extensions, code } }];
  });
}

/**
 * Normalizes SDK, ofetch, H3, malformed, and extension-defined Directus errors safely.
 * @param error Unknown thrown value.
 * @returns A stable normalized error result.
 */
export function useDirectusError(error: unknown): DirectusErrorResult {
  const directusEnvelope = findNestedEntries(error, "errors");

  if (!directusEnvelope) {
    const validationEnvelope = findNestedEntries(error, "issues");
    const nitroError = validationEnvelope ? normalizeNitroError(validationEnvelope) : undefined;
    if (nitroError) return nitroError;

    const statusCode = getStatusCode(error);
    return {
      ...normalizedErrorFlagDefaults,
      errors: [],
      ...(statusCode === undefined ? {} : { statusCode })
    };
  }

  const errors = normalizeDirectusEntries(directusEnvelope.entries);
  const invalidCredentials = hasErrorCode(errors, "INVALID_CREDENTIALS");
  const tokenExpired = hasErrorCode(errors, "TOKEN_EXPIRED");

  return {
    ...normalizedErrorFlagDefaults,
    isDirectusError: true,
    errors,
    ...(directusEnvelope.statusCode === undefined
      ? {}
      : { statusCode: directusEnvelope.statusCode }),
    isOtpError: hasErrorCode(errors, "INVALID_OTP"),
    isInvalidCredentialError: invalidCredentials,
    isForbiddenError: hasErrorCode(errors, "FORBIDDEN"),
    isTokenExpiredError: tokenExpired,
    isInvalidTokenError: hasErrorCode(errors, "INVALID_TOKEN"),
    isValidationError: hasErrorCode(
      errors,
      "FAILED_VALIDATION",
      "INVALID_PAYLOAD",
      "INVALID_QUERY",
      "UNPROCESSABLE_CONTENT"
    ),
    isRateLimitError: hasErrorCode(errors, "REQUESTS_EXCEEDED"),
    isServiceUnavailableError: hasErrorCode(errors, "SERVICE_UNAVAILABLE"),
    isRouteNotFoundError: hasErrorCode(errors, "ROUTE_NOT_FOUND")
  };
}
