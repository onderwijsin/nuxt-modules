---
"@onderwijsin/nuxt-simple-rate-limiter": minor
"@onderwijsin/nuxt-newsletter-signup": patch
---

Add global per-IP rate limiting and make exceeded limits consistently throw 429 errors with a
`bannedUntil` timestamp and active limit configuration.
