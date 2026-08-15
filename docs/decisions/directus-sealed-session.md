# Decision: Use H3 for sealed Directus sessions

- **Status:** Accepted
- **Date:** 2026-08-13
- **Scope:** Session sealing, rotation, cookies, and runtime boundaries

## Context

Directus authentication needs an encrypted, rotating session cookie without duplicating
cryptographic implementation or exposing access and refresh tokens to browser JavaScript. The
migration also requires an explicit cookie prefix and a controlled format.

## Decision

The Directus client uses H3's public `useSession`, `unsealSession`, and `sealSession` primitives.
The module owns only the `boop1:<data>` prefix, secret-rotation dispatch, and Directus payload
validation. Authentication is cookie-only with `sessionHeader: false`.

Authentication requires a server-only session secret of at least 32 characters when enabled.
Previous secrets support rotation. New sessions use the active secret; reads try active then
previous secrets and reseal sessions opened with a previous secret. Legacy unsigned base64url JSON
and values without the `boop1:` prefix are never trusted.

The complete session remains server-only. Only a token-free user snapshot enters Nuxt application
state. Invalid, expired, tampered, wrong-key, and schema-invalid cookies fail closed. Sealed values
are bounded and never logged.

## Alternatives considered

- A custom cryptographic implementation: rejected because H3 already provides the required public
  authenticated-sealing primitives.
- Token-bearing client state: rejected because browser code must not receive access or refresh
  tokens.
- Accepting legacy unsigned cookies: rejected because untrusted data must not become authenticated
  state.
- A session header: rejected because authentication is intentionally cookie-only.

## Consequences

H3 owns the security-sensitive sealing primitive and cookie attributes, reducing cryptographic
maintenance. Operators must retain previous secrets for at least the cookie lifetime plus a rolling
deployment window, and shared storage is required for safe cross-instance refresh coordination. The
playground can inspect sealed and decrypted values locally, with secrets masked by default.

## Reconsideration criteria

Revisit this decision if H3 changes its public session primitives, the cookie migration contract is
retired, or a different authentication transport is explicitly required.
