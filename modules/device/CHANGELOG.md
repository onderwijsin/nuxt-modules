# Changelog

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
