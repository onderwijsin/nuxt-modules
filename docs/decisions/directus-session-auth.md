# Directus session authentication

Read this decision before changing Directus login, refresh, logout, session cookies, current-user
snapshots, storage coordination, or the `useDirectusAuth()` facade. The constraints below are an API
and security decision, not an incidental implementation pattern.

The Directus module uses a plain, bounded, httpOnly cookie as its first session implementation. The
cookie contains the access token, rotating refresh token, expiry, and a token-free snapshot derived
from the current-user endpoint. Application code receives only that snapshot through
useDirectusAuth(); browser JavaScript never receives either token.

The module deliberately does not use the Directus SDK authentication() composable. That API owns
mutable client token state and can refresh concurrently, which conflicts with request-scoped Nuxt
clients and a reactive facade. Login, refresh, logout, and current-user requests are module-owned
REST operations instead.

Refresh is gated immediately before an authenticated Directus request. Nitro storage coordinates
concurrent refreshes for the same refresh token, and successful rotation replaces the entire cookie
after rebuilding the user snapshot. Invalid refreshes clear the local cookie. Cross-instance
coordination requires a shared, read-after-write consistent Nitro storage driver; with the default
in-memory driver, horizontally scaled instances or Cloudflare isolates can still race, and Directus'
rotating refresh-token policy remains authoritative.

The first snapshot intentionally contains only the user identity fields needed by the playground and
auth facade. Role, policy, and permission helpers are not exposed by this release. The cookie is
bounded below normal browser cookie limits; serialization fails rather than truncating state. It is
intentionally not encrypted or signed in this first release. Directus permissions remain the
authorization boundary, while encryption/signing or a different session storage model are future
hardening options requiring a separate threat-model decision.
