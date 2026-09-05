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
  | "INVALID_PASSWORD_RESET_TOKEN_INPUT"
  | "INVALID_MAGIC_LINK_TOKEN_INPUT";

export type NormalizedErrorCode = DirectusErrorCode | NitroErrorCode;

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

export interface NormalizedErrorEntry<TCode extends NormalizedErrorCode = NormalizedErrorCode> {
  readonly message: string;
  readonly code: TCode;
  readonly extensions: DirectusErrorExtensions<TCode>;
}

type NormalizedErrorFlagDefaults = {
  readonly isDirectusError: boolean;
  readonly isNitroError: boolean;
  readonly isOtpError: boolean;
  readonly isInvalidCredentialError: boolean;
  readonly isForbiddenError: boolean;
  readonly isTokenExpiredError: boolean;
  readonly isInvalidTokenError: boolean;
  readonly isValidationError: boolean;
  readonly isRateLimitError: boolean;
  readonly isServiceUnavailableError: boolean;
  readonly isRouteNotFoundError: boolean;
  readonly isInvalidAuthInput: boolean;
  readonly isInvalidEmailInput: boolean;
  readonly isInvalidPasswordInput: boolean;
  readonly isInvalidOtpInput: boolean;
  readonly isInvalidPasswordResetTokenInput: boolean;
  readonly isInvalidMagicLinkTokenInput: boolean;
};
type NormalizedErrorFlagName = keyof NormalizedErrorFlagDefaults;
type NormalizedErrorFlagOverrides = Partial<Record<NormalizedErrorFlagName, boolean>>;
type NormalizedErrorFlags<TOverrides extends NormalizedErrorFlagOverrides> = Readonly<
  Omit<NormalizedErrorFlagDefaults, keyof TOverrides> & TOverrides
>;
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
    isInvalidMagicLinkTokenInput: boolean;
  }
>;

/** Any result returned by the Directus error normalizer. */
export type DirectusErrorResult =
  | NormalizedDirectusError
  | NormalizedNitroError
  | NormalizedUnknownError;
