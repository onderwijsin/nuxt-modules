# Directus session authentication

The Directus module uses a plain, bounded, httpOnly cookie as its first session implementation. The
cookie contains the access token, rotating refresh token, expiry, and a token-free snapshot derived
from the current-user endpoint. Application code receives only that snapshot through
useDirectusAuth(); browser JavaScript never receives either token.

The module deliberately does not use the Directus SDK authentication() composable. That API owns
mutable client token state and can refresh concurrently, which conflicts with request-scoped Nuxt
clients and a reactive facade. Login, refresh, logout, and current-user requests are module-owned
REST operations instead.

Refresh is gated immediately before an authenticated Directus request. A runtime-instance map
coalesces concurrent refreshes for the same refresh token, and successful rotation replaces the
entire cookie after rebuilding the user snapshot. Invalid refreshes clear the local cookie. The
single-flight guarantee is limited to one runtime instance: two horizontally scaled instances can
race, and Directus' rotating refresh-token policy remains authoritative.

The first snapshot intentionally contains only the user identity fields needed by the playground and
auth facade. Role, policy, and permission inheritance are deferred until their exact Directus
payload and authorization contract are designed. The cookie is bounded below normal browser cookie
limits; serialization fails rather than truncating state. It is intentionally not encrypted or
signed in this first release. Directus permissions remain the authorization boundary, while
encryption/signing or a different session storage model are future hardening options requiring a
separate threat-model decision.
