---
"@onderwijsin/nuxt-ui-form-extensions": patch
"@onderwijsin/nuxt-theme-customizer": patch
"@onderwijsin/nuxt-loops-renderer": patch
"@onderwijsin/nuxt-healthcheck": patch
"@onderwijsin/nuxt-static-text": patch
"@onderwijsin/nuxt-webmanifest": patch
"@onderwijsin/nuxt-turnstile": patch
"@onderwijsin/nuxt-device": patch
---

Added shared module utilities for runtime transpilation, typed object entry conversion, and consistent option validation. Updated consuming modules to use the shared helpers, preserve arbitrary option keys, and remove duplicated setup/validation logic. No public consumer API changes.
