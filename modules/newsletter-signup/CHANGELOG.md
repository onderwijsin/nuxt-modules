# Changelog

## 1.0.4

### Patch Changes

- 4c70ca0: Align newsletter signup consumer documentation with the current normalized error contract.
- 4c70ca0: Add lenient maximum lengths to newsletter signup payload fields.
- 7e46f91: Synchronize module documentation and consumer skills with the current implementation.
- 5e3b6fb: Declare the internal rate limiter as a Nuxt module dependency without restricting its version.
- Updated dependencies [7cb45c8]
- Updated dependencies [4c70ca0]
- Updated dependencies [76cb9d0]
- Updated dependencies [4810903]
- Updated dependencies [4c70ca0]
  - @onderwijsin/nuxt-module-utils@0.2.1
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.0

## 1.0.3

### Patch Changes

- 8c84b5d: Harden newsletter signup list authorization and Mailchimp member upserts, and prevent provider or
  external error details from exposing sensitive data in server logs.
- 438e854: Add shared primitive runtime guards, including `isFunction`, and migrate repeated module-local checks to the new API.
- c19384b: Preserve prefixed deployments in health checks and web manifests, make disabled newsletter signup
  inert, and namespace and harden theme customizer routes, components, palettes, and controls.
- 132746b: Centralize conditional module dependency registration and apply the shared enablement contract
  consistently across the affected modules.
- 40c6668: Add global per-IP rate limiting and make exceeded limits consistently throw 429 errors with a
  `bannedUntil` timestamp and active limit configuration.
- Updated dependencies [438e854]
- Updated dependencies [132746b]
- Updated dependencies [40c6668]
  - @onderwijsin/nuxt-module-utils@0.2.0
  - @onderwijsin/nuxt-simple-rate-limiter@0.3.0

## 1.0.2

### Patch Changes

- 33bc382: Update module utility imports to the published `@onderwijsin/nuxt-module-utils` package.
- Updated dependencies [33bc382]
- Updated dependencies [33bc382]
  - @onderwijsin/nuxt-simple-rate-limiter@0.2.1
  - @onderwijsin/nuxt-module-utils@0.1.0

## 1.0.1

### Patch Changes

- 48013e2: Add a path-scoped, server-side rate limiter and use it for newsletter signup protection.
- ae69b48: Keep newsletter rate limiting local to the endpoint without overriding consumer API Shield settings.
- Updated dependencies [48013e2]
  - @onderwijsin/nuxt-simple-rate-limiter@0.2.0

## 1.0.0

### Major Changes

- 5c1751f: Harden validation and runtime behavior across modules. Turnstile now requires the expected action,
  draft forms support arrays and dates, generated webmanifest icons honor requested formats, and
  health checks have bounded execution with safe public errors. Theme persistence validates stored
  data, and custom color tokens remain unique after mutations. The newsletter endpoint is rate
  limited through nuxt-api-shield, uses bounded provider requests, treats duplicate subscriptions as
  idempotent, and separates its browser and server runtime exports. Device removes the ineffective
  `refreshOnResize` option.

## 0.2.0

### Minor Changes

- 5d6d5aa: Add the provider-independent newsletter signup module with Loops and Mailchimp adapters,
  configurable list and field mappings, and a typed client composable.

### Patch Changes

- 70ff6f1: Refactor module option validation to parse complete module-owned Zod schemas directly, with uniform validation error logging and typed validated options.

## 0.1.0

- Initial newsletter signup endpoint with Loops and Mailchimp adapters.
