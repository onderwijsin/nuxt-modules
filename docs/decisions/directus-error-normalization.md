# Directus and Nitro error normalization

Read this decision before changing `useDirectusError`, normalized Directus error flags, Nitro/H3
validation handling, authentication validation codes, or the playground error examples.

`useDirectusError` is the single consumer-facing error boundary for Directus requests made through
the module. It normalizes errors from the Directus SDK, `ofetch`, H3, and malformed thrown values so
application code can make stable UI decisions without depending on transport-specific nesting.

## Why local Nitro errors are part of this boundary

The module validates public authentication input in Nitro before forwarding it to Directus. H3 wraps
Zod failures as a `400` error whose validation issues are nested in `error.data.issues`; these
errors therefore do not have a Directus `errors` envelope. Before this decision, `useDirectusError`
returned an empty error list and no useful validation signal for those failures.

That gap is important for authentication UX and security. A consumer needs to distinguish an invalid
email, oversized password, OTP, or password-reset token and show an actionable message such as “the
password must be 512 characters or fewer.” The normalizer is the appropriate boundary because it
already owns safe error extraction and is the public API consumers use after failed requests.

## Error origins and discriminators

The result distinguishes the two supported structured origins:

- `isDirectusError: true` identifies a valid Directus `errors` envelope. Its error codes are
  retained exactly as provided by Directus, including extension-defined codes.
- `isNitroError: true` identifies a valid Nitro/H3 validation `issues` envelope produced by local
  module validation. These entries use `NitroErrorCode` values and expose field-specific flags.

Unknown errors have both discriminator flags set to `false` and an empty `errors` array. The shared
`isValidationError` flag is `true` for both Directus validation codes and recognized Nitro
validation issues; use the discriminator when the origin matters.

Nitro codes are never added to a Directus envelope. This prevents local implementation details from
being presented as if they were upstream Directus codes and keeps Directus error compatibility
intact.

## Public Nitro validation contract

Nitro authentication issues map to these codes and flags:

| Field                                  | Code                                 | Flag                               |
| -------------------------------------- | ------------------------------------ | ---------------------------------- |
| Unknown auth field or auth-level issue | `INVALID_AUTH_INPUT`                 | `isInvalidAuthInput`               |
| `email`                                | `INVALID_EMAIL_INPUT`                | `isInvalidEmailInput`              |
| `password`                             | `INVALID_PASSWORD_INPUT`             | `isInvalidPasswordInput`           |
| `otp`                                  | `INVALID_OTP_INPUT`                  | `isInvalidOtpInput`                |
| `token`                                | `INVALID_PASSWORD_RESET_TOKEN_INPUT` | `isInvalidPasswordResetTokenInput` |

Each normalized entry keeps the safe validator message and includes relevant metadata in
`errors[].extensions`, such as `field`, `reason`, `maximum`, `minimum`, and `inclusive`. Raw input
values and secrets must not be copied into normalized extensions.

The normalized API exposes one canonical flag for each condition. Legacy duplicate aliases such as
`invalidCredentials` and `tokenExpired` are intentionally not part of the contract.

## Compatibility and extension policy

Adding a new recognized upstream Directus code or a new Nitro validation field is additive when it
does not change existing meanings. Preserve the following invariants:

1. Directus envelopes remain upstream-shaped and upstream-coded.
2. Nitro/H3 validation envelopes are recognized through the existing nested `data`/`response`
   traversal.
3. Unknown and malformed values remain safe to inspect and never expose untrusted secrets through
   normalized extensions.
4. Every new public flag and code is documented, tested, and demonstrated in the playground when it
   changes consumer-visible behavior.
