import { isArray, isInteger, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

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

/** Error codes emitted for Nitro validation failures in the module's auth handlers. */
export type NitroErrorCode =
  | "INVALID_AUTH_INPUT"
  | "INVALID_EMAIL_INPUT"
  | "INVALID_PASSWORD_INPUT"
  | "INVALID_OTP_INPUT"
  | "INVALID_PASSWORD_RESET_TOKEN_INPUT";

/** Any error code understood by the normalizer. */
type NormalizedErrorCode = DirectusErrorCode | NitroErrorCode;

/** Safe contextual values attached to a normalized error. */
export interface DirectusErrorExtensions<TCode extends NormalizedErrorCode = NormalizedErrorCode> {
  readonly code: TCode;
  readonly collection?: string;
  readonly field?: string;
  readonly value?: unknown;
  readonly reason?: string;
  readonly path?: string;
  readonly stack?: string;
  readonly [key: string]: unknown;
}

/** A single normalized error entry. */
interface NormalizedErrorEntry<TCode extends NormalizedErrorCode = NormalizedErrorCode> {
  readonly message: string;
  readonly code: TCode;
  readonly extensions: DirectusErrorExtensions<TCode>;
}

/** Default state for every normalized error flag. */
const normalizedErrorFlagDefaults = {
  isDirectusError: false,
  isNitroError: false,
  isOtpError: false,
  isInvalidCredentialError: false,
  isForbiddenError: false,
  isTokenExpiredError: false,
  isInvalidTokenError: false,
  isValidationError: false,
  isRateLimitError: false,
  isServiceUnavailableError: false,
  isRouteNotFoundError: false,
  isInvalidAuthInput: false,
  isInvalidEmailInput: false,
  isInvalidPasswordInput: false,
  isInvalidOtpInput: false,
  isInvalidPasswordResetTokenInput: false
} as const;

/** Default error flag shape. */
type NormalizedErrorFlagDefaults = typeof normalizedErrorFlagDefaults;

/** Names of flags exposed by normalized errors. */
type NormalizedErrorFlagName = keyof NormalizedErrorFlagDefaults;

/** Valid type-level overrides for normalized error flags. */
type NormalizedErrorFlagOverrides = Partial<Record<NormalizedErrorFlagName, boolean>>;

/** Replaces selected default flag types for a particular error variant. */
type NormalizedErrorFlags<TOverrides extends NormalizedErrorFlagOverrides> = Readonly<
  Omit<NormalizedErrorFlagDefaults, keyof TOverrides> & TOverrides
>;

/** Common normalized error structure with variant-specific flags. */
type NormalizedErrorVariant<
  TErrors extends readonly NormalizedErrorEntry[],
  TOverrides extends NormalizedErrorFlagOverrides = {}
> = NormalizedErrorFlags<TOverrides> & {
  readonly errors: TErrors;
  readonly statusCode?: number;
};

/** A normalized Directus error. */
export type NormalizedDirectusError = NormalizedErrorVariant<
  readonly NormalizedErrorEntry<NormalizedErrorCode>[],
  {
    isDirectusError: true;
    isOtpError: boolean;
    isInvalidCredentialError: boolean;
    isForbiddenError: boolean;
    isTokenExpiredError: boolean;
    isInvalidTokenError: boolean;
    isValidationError: boolean;
    isRateLimitError: boolean;
    isServiceUnavailableError: boolean;
    isRouteNotFoundError: boolean;
  }
>;

/** A normalized unknown error. */
export type NormalizedUnknownError = NormalizedErrorVariant<readonly []>;

/** A normalized Nitro validation error. */
export type NormalizedNitroError = NormalizedErrorVariant<
  readonly NormalizedErrorEntry<NitroErrorCode>[],
  {
    isNitroError: true;
    isValidationError: true;
    isInvalidAuthInput: true;
    isInvalidEmailInput: boolean;
    isInvalidPasswordInput: boolean;
    isInvalidOtpInput: boolean;
    isInvalidPasswordResetTokenInput: boolean;
  }
>;

/** Any result returned by the Directus error normalizer. */
export type DirectusErrorResult =
  | NormalizedDirectusError
  | NormalizedNitroError
  | NormalizedUnknownError;

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
  token: "INVALID_PASSWORD_RESET_TOKEN_INPUT"
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
