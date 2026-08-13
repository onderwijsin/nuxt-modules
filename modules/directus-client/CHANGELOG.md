# Changelog

## 0.4.0

### Minor Changes

- 300d504: Seal Directus authentication session cookies with H3 authenticated encryption, add active/previous
  session-secret rotation, and add a local sealed-session playground inspection page.

### Patch Changes

- 300d504: Harden Directus sessions by enforcing payload expiry, masking playground diagnostics by default,
  isolating the inspection route to development, and sealing refresh results stored in Nitro storage.
- c8350e1: Bound Directus authentication request fields and expose structured, field-specific errors for local validation failures before forwarding values upstream.
- Updated dependencies [d4460bc]
- Updated dependencies [300d504]
  - @onderwijsin/nuxt-directus-config@0.3.0

## 0.3.0

### Minor Changes

- 6826e72: Rename the Directus client module and package from `@onderwijsin/nuxt-directus` to `@onderwijsin/nuxt-directus-client`. This new package replaces the old package; update the Nuxt module/config key to `directusClient` and install the new package name.
- 44945f6: Align Directus module options with the shared `instance` and `client` configuration shape.

### Patch Changes

- c5b960c: Resolve conditional Directus module dependencies from executable shared configuration during Nuxt dependency discovery.
- f78b723: Co-locate public module option types with their Zod schemas and preserve runtime domain types in published runtime-owned locations.
- 1fbac08: Expose the server Directus composables through a published runtime subpath for reusable Nitro code.
- Updated dependencies [44945f6]
- Updated dependencies [44945f6]
- Updated dependencies [91ebdd2]
- Updated dependencies [b7a6f6f]
- Updated dependencies [b7a6f6f]
- Updated dependencies [c5b960c]
- Updated dependencies [b1cd828]
- Updated dependencies [f78b723]
- Updated dependencies [b7a6f6f]
- Updated dependencies [91ebdd2]
  - @onderwijsin/nuxt-directus-config@0.2.0
  - @onderwijsin/nuxt-turnstile@0.2.7
  - @onderwijsin/nuxt-module-utils@0.4.0

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
