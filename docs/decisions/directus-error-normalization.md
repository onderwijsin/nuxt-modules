# Decision: Normalize Directus and Nitro errors at one boundary

- **Status:** Accepted
- **Date:** 2026-08-13
- **Scope:** Directus client error handling and Nitro validation errors

## Context

Directus SDK, `ofetch`, H3, and malformed thrown values expose different error shapes. Consumers
need stable UI decisions without depending on transport-specific nesting, including for
authentication input validated locally in Nitro.

## Decision

`useDirectusError` is the single consumer-facing error boundary. It distinguishes valid Directus
`errors` envelopes from Nitro/H3 validation `issues` envelopes. Directus codes are retained exactly;
Nitro issues use `NitroErrorCode` values and field-specific flags. Unknown errors set both origin
flags to `false` and expose an empty error list.

Nitro validation maps to `INVALID_AUTH_INPUT`, `INVALID_EMAIL_INPUT`, `INVALID_PASSWORD_INPUT`,
`INVALID_OTP_INPUT`, and `INVALID_PASSWORD_RESET_TOKEN_INPUT`. Normalized entries retain safe
validator messages and metadata such as field, reason, bounds, and inclusivity. Raw inputs and
secrets are not copied into extensions, and local Nitro codes are never added to Directus envelopes.

## Alternatives considered

- Exposing transport-specific errors directly: rejected because it couples consumers to SDK and H3
  implementation details.
- Mapping Nitro issues into Directus codes: rejected because it misrepresents local validation as an
  upstream Directus contract.
- Returning only a generic error: rejected because authentication UX needs actionable field signals.

## Consequences

Consumers get one stable, safe error API with origin and validation discriminators. New recognized
codes and fields require documentation, tests, and playground coverage when consumer-visible. The
normalizer must continue to safely traverse nested H3 error shapes.

## Reconsideration criteria

Revisit this decision if Directus or H3 establishes a common stable error envelope, or if a new
consumer-facing error origin requires a third explicit discriminator.
