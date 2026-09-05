# Decision: Keep Directus session authentication module-owned

- **Status:** Accepted
- **Date:** 2026-08-13
- **Scope:** Directus login, refresh, logout, and session facade

## Context

The Directus SDK authentication composable owns mutable client token state and can refresh
concurrently. That conflicts with request-scoped Nuxt clients and a reactive authentication facade.

## Decision

The Directus module owns login, refresh, logout, and current-user REST operations. It exposes a
token-free user snapshot through `useDirectusAuth()`; browser JavaScript never receives access or
refresh tokens.

Refresh runs immediately before an authenticated request when the access token enters the configured
safety window. It may still use the refresh token after access-token expiry; Directus remains
authoritative for refresh-token validity. Nitro storage coordinates concurrent refreshes for the
same refresh token, successful rotation replaces the entire cookie, and invalid refreshes clear it.
SSR authentication bootstrap and public session snapshots run through this refresh boundary before
reporting authentication state. Raw sealed-session readers only inspect local session data, return
expired access tokens by default so callers can retain the refresh token, and do not clear a valid
sealed session when a caller explicitly filters expired access tokens. Cross-instance coordination
requires shared, read-after-write-consistent storage; with the default in-memory driver,
horizontally scaled instances or Cloudflare isolates can still race, and Directus remains
authoritative for rotating refresh-token policy.

Refresh calls are single-attempt operations because Directus may rotate a refresh token even when a
response is lost. Before Directus returns a replacement token pair, only definitive
authentication/session rejections clear the local session: recognized Directus authentication codes
on a 4xx response (including `INVALID_TOKEN`, `TOKEN_EXPIRED`, `SESSION_EXPIRED`, `FORBIDDEN`,
`UNAUTHORIZED`, `INVALID_CREDENTIALS`, and `INVALID_OTP`) or an HTTP 401 response. Transport
failures, HTTP 429, and HTTP 5xx responses are transient and preserve the sealed session while
surfacing a temporary service failure. Once Directus returns a replacement pair, any later local
persistence failure clears the old session because its refresh token may already have been rotated.
Transient refresh-flight poisoning after the storage record expires remains unresolved here and is
tracked by #257/#258; this decision does not define a logical expiry workaround for that state.

The initial snapshot exposes only the identity fields needed by the playground and facade. Roles,
policies, and permission helpers are intentionally not part of this release. Sealing and rotation
are defined separately in [directus-sealed-session.md](directus-sealed-session.md).

## Alternatives considered

- The Directus SDK authentication composable: rejected because mutable client token state and
  concurrent refresh do not fit request-scoped Nuxt clients.
- Exposing tokens to the browser: rejected because token custody belongs to the server session.
- Treating the session snapshot as authorization: rejected because Directus remains the
  authorization boundary.

## Consequences

The facade is reactive and server-controlled, but refresh coordination depends on the configured
storage topology. Applications must provide shared storage when horizontal consistency matters.
Permission decisions remain in Directus rather than in client-visible session state.

## Reconsideration criteria

Revisit this decision if the Directus SDK provides request-scoped authentication with safe refresh
coordination, or if the public facade needs additional identity data without weakening token
custody.
