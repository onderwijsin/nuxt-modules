---
"@onderwijsin/nuxt-directus-client": minor
---

Add conditional magic-link request and redemption Nitro routes. Redemption always uses Directus
`mode: "json"` and stores the resulting authentication in the existing sealed session. Add a
dedicated `magicLinkRequest` Turnstile action.
