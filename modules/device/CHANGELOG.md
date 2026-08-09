# Changelog

## 1.0.3

### Patch Changes

- 8364cdb: Validate device module options with the module option schema.
- Updated dependencies [438e854]
- Updated dependencies [132746b]
  - @onderwijsin/nuxt-module-utils@0.2.0

## 1.0.2

### Patch Changes

- 33bc382: Update module utility imports to the published `@onderwijsin/nuxt-module-utils` package.
- Updated dependencies [33bc382]
  - @onderwijsin/nuxt-module-utils@0.1.0

## 1.0.1

### Patch Changes

- ae69b48: Retain user-agent operating-system flags when Cloudflare supplies device classification.

## 1.0.0

### Major Changes

- 5c1751f: Harden validation and runtime behavior across modules. Turnstile now requires the expected action,
  draft forms support arrays and dates, generated webmanifest icons honor requested formats, and
  health checks have bounded execution with safe public errors. Theme persistence validates stored
  data, and custom color tokens remain unique after mutations. The newsletter endpoint is rate
  limited through nuxt-api-shield, uses bounded provider requests, treats duplicate subscriptions as
  idempotent, and separates its browser and server runtime exports. Device removes the ineffective
  `refreshOnResize` option.

## 0.2.1

### Patch Changes

- 70ff6f1: Refactor module option validation to parse complete module-owned Zod schemas directly, with uniform validation error logging and typed validated options.
- ec29c96: Update module utils import to runtime dependent namespace
- 212ae9b: Fix augmented nuxt/schema modules
- 8bb6cd7: Added shared module utilities for runtime transpilation, typed object entry conversion, and consistent option validation. Updated consuming modules to use the shared helpers, preserve arbitrary option keys, and remove duplicated setup/validation logic. No public consumer API changes.

## 0.2.0

### Minor Changes

- 6e7fafc: Add the publishable `@onderwijsin/nuxt-device` module with SSR-aware device detection, browser and
  crawler flags, tests, documentation, and an isolated playground.

## 0.1.0

- Add the publishable `@onderwijsin/nuxt-device` module with SSR-aware device detection,
  browser flags, crawler detection, tests, and a playground.
