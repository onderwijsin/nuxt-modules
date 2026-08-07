---
"@onderwijsin/nuxt-turnstile": patch
"@onderwijsin/nuxt-ui-form-extensions": patch
"@onderwijsin/nuxt-webmanifest": patch
"@onderwijsin/nuxt-healthcheck": minor
"@onderwijsin/nuxt-theme-customizer": patch
"@onderwijsin/nuxt-device": major
"@onderwijsin/nuxt-newsletter-signup": major
---

Harden validation and runtime behavior across modules. Turnstile now requires the expected action,
draft forms support arrays and dates, generated webmanifest icons honor requested formats, and
health checks have bounded execution with safe public errors. Theme persistence validates stored
data, and custom color tokens remain unique after mutations. The newsletter endpoint is rate
limited through nuxt-api-shield, uses bounded provider requests, treats duplicate subscriptions as
idempotent, and separates its browser and server runtime exports. Device removes the ineffective
`refreshOnResize` option.
