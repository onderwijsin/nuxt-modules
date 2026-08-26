# Changelog

## 0.3.8

### Patch Changes

- 451c582: Raise the supported and validated Node.js baseline to Node.js 24.
- Updated dependencies [1e30fbb]
- Updated dependencies [451c582]
  - @onderwijsin/nuxt-module-utils@0.5.1

## 0.3.7

### Patch Changes

- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
  - @onderwijsin/nuxt-module-utils@0.5.0

## 0.3.6

### Patch Changes

- 8563adc: Fix discovery of custom healthcheck components in Nuxt 4 applications that use the default `app/` source directory.
- f78b723: Co-locate public module option types with their Zod schemas and preserve runtime domain types in published runtime-owned locations.
- Updated dependencies [91ebdd2]
  - @onderwijsin/nuxt-module-utils@0.4.0

## 0.3.5

### Patch Changes

- 71fa936: Import module setup utilities from the build subpath of module-utils
- Updated dependencies [8613ce0]
- Updated dependencies [71fa936]
  - @onderwijsin/nuxt-module-utils@0.3.0

## 0.3.4

### Patch Changes

- 7e46f91: Synchronize module documentation and consumer skills with the current implementation.
- Updated dependencies [7cb45c8]
  - @onderwijsin/nuxt-module-utils@0.2.1

## 0.3.3

### Patch Changes

- 8c84b5d: Harden newsletter signup list authorization and Mailchimp member upserts, and prevent provider or
  external error details from exposing sensitive data in server logs.
- 438e854: Add shared primitive runtime guards, including `isFunction`, and migrate repeated module-local checks to the new API.
- c19384b: Preserve prefixed deployments in health checks and web manifests, make disabled newsletter signup
  inert, and namespace and harden theme customizer routes, components, palettes, and controls.
- Updated dependencies [438e854]
- Updated dependencies [132746b]
  - @onderwijsin/nuxt-module-utils@0.2.0

## 0.3.2

### Patch Changes

- 33bc382: Update module utility imports to the published `@onderwijsin/nuxt-module-utils` package.
- Updated dependencies [33bc382]
  - @onderwijsin/nuxt-module-utils@0.1.0

## 0.3.1

### Patch Changes

- ae69b48: Apply configured healthcheck timeouts to built-in Cloudinary and Directus requests.

## 0.3.0

### Minor Changes

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
- 8bb6cd7: Added shared module utilities for runtime transpilation, typed object entry conversion, and consistent option validation. Updated consuming modules to use the shared helpers, preserve arbitrary option keys, and remove duplicated setup/validation logic. No public consumer API changes.

## 0.2.0

### Minor Changes

- 91c864a: Add the configurable and extensible healthcheck module with cache, Cloudinary, Directus, and
  consumer-defined server-side health components.

## 0.1.0

- Initial configurable and extensible healthcheck module.
