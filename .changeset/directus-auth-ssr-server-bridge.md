---
"@onderwijsin/nuxt-directus-client": minor
---

Add complete SSR support to `useDirectusAuth()` authentication operations.

- Login, refresh, logout, password reset, password-reset requests, magic-link requests, and
  magic-link redemption now execute directly against the request-bound server utilities during SSR.
- Browser calls continue to use the same-origin `/_directus/auth` proxy handlers.
- Public authentication handlers continue to enforce CSRF and Turnstile validation, while trusted
  SSR calls avoid the internal HTTP hop and browser-only security metadata requirements.
- Shared server utilities keep SSR and HTTP-handler Directus payloads and session behavior aligned.

This is a minor release because authentication operations that previously failed during SSR, most
notably magic-link redemption from initial page middleware, are now supported.
