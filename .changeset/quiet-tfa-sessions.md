---
"@onderwijsin/nuxt-directus-client": minor
---

Refactor authentication session construction so login and refresh share the same validated session
path, and expose the server-derived `requiresTfaSetup` flag in the token-free session snapshot.

This changes nullable identity fields in `DirectusSessionSnapshot` from optional properties to
explicit `null` values when Directus does not return them. The TFA flag is informational only;
consuming applications remain responsible for TFA setup UX and navigation.
