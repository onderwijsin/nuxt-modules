---
"@onderwijsin/nuxt-directus-client": minor
"@onderwijsin/nuxt-directus-config": minor
---

Separate stable authentication facts from mutable current-user data. The auth snapshot now only
contains `userId` and `requiresTfaSetup`; consumers that read profile fields from
`useDirectusAuth()._session` should enable/configure `client.auth.user` and move those reads to
`useDirectusUser()`. Call its `refresh()` after profile mutations when immediate local freshness is
required.
