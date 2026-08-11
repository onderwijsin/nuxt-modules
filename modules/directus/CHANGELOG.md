# Changelog

## 0.2.0

### Minor Changes

- f96d521: Harden Directus proxy and error handling, make type generation explicitly configurable, and improve module validation coverage.
- 402843c: Add opt-in Turnstile protection for Directus login and password-reset requests.
- 3e13ec3: Scaffold the server-safe Directus module, validate its proxy and command boundaries, and add deterministic Directus schema generation with opt-in normalization.
- 743f501: Implement the Directus REST proxy, request-scoped server client, browser proxy client, and typed
  `useDirectus`/`useDirectusServer` command helpers with server-only credential selection.
- 572bfa8: Add preview-aware `readItems` item-by-path helpers and stable Directus error normalization.
- e4467b8: Add optional cookie-backed Directus session authentication with safe user snapshots, refresh
  coordination, and the useDirectusAuth facade.
- f1efb3c: Enable all Directus type-generation augmentations by default.

### Patch Changes

- 3de1936: Reject cross-origin and headerless authentication mutations before they can change a cookie-backed
  Directus session.
- 9466e21: Clarify Directus configuration, composables, version previews, authentication, type generation, and proxy behavior in the consumer documentation.
- e4467b8: Align recognized Directus error codes with the documented core codes, add common UI error
  shortcuts, and add a playground for common error scenarios.
- c50f1f4: Require `baseUrl` for enabled configurations, ignore session cookies when auth is disabled, and
  reject cross-origin credentialed proxy mutations.
- 5d5e665: Fix the type-generation optional-field transform's complex-type detection regex.
- Updated dependencies [743f501]
- Updated dependencies [93f1b2f]
  - @onderwijsin/nuxt-module-utils@0.3.1
  - @onderwijsin/nuxt-turnstile@0.2.6

## 0.1.0

- Scaffold the server-safe Directus Nuxt module and validate its initial configuration surface.
