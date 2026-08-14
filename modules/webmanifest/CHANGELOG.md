# Changelog

## 0.2.8

### Patch Changes

- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
  - @onderwijsin/nuxt-module-utils@0.5.0

## 0.2.7

### Patch Changes

- f78b723: Co-locate public module option types with their Zod schemas and preserve runtime domain types in published runtime-owned locations.
- Updated dependencies [91ebdd2]
  - @onderwijsin/nuxt-module-utils@0.4.0

## 0.2.6

### Patch Changes

- 71fa936: Import module setup utilities from the build subpath of module-utils
- Updated dependencies [8613ce0]
- Updated dependencies [71fa936]
  - @onderwijsin/nuxt-module-utils@0.3.0

## 0.2.5

### Patch Changes

- 438e854: Add shared primitive runtime guards, including `isFunction`, and migrate repeated module-local checks to the new API.
- c19384b: Preserve prefixed deployments in health checks and web manifests, make disabled newsletter signup
  inert, and namespace and harden theme customizer routes, components, palettes, and controls.
- 132746b: Centralize conditional module dependency registration and apply the shared enablement contract
  consistently across the affected modules.
- Updated dependencies [438e854]
- Updated dependencies [132746b]
  - @onderwijsin/nuxt-module-utils@0.2.0

## 0.2.4

### Patch Changes

- 33bc382: Update module utility imports to the published `@onderwijsin/nuxt-module-utils` package.
- Updated dependencies [33bc382]
  - @onderwijsin/nuxt-module-utils@0.1.0

## 0.2.3

### Patch Changes

- ae69b48: Respect Nuxt application base URLs in generated manifest links and defaults.

## 0.2.2

### Patch Changes

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

- 83be6ae: Add the publishable webmanifest module with zero-config Site Config and Schema.org metadata,
  Cloudinary/IPX icon generation, explicit icon overrides, development-time manifest links, and Nuxt
  e2e tests.

## 0.1.0

- Initial publishable module migration.
