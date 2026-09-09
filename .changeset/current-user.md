---
"@onderwijsin/nuxt-directus-client": minor
"@onderwijsin/nuxt-directus-config": minor
---

Separate stable authentication facts from mutable current-user data. The auth snapshot contains
only `userId` and `requiresTfaSetup`; configure `client.auth.user.fields` for profile data and use
`useDirectusUser()` to fetch it, optionally map it server-side, and refresh it after profile
mutations. The browser and SSR use the same current-user route, including SSR session-cookie
rotation.
