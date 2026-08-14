# Changelog

## 0.4.3

### Patch Changes

- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
  - @onderwijsin/nuxt-module-utils@0.5.0
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.3

## 0.4.2

### Patch Changes

- f78b723: Co-locate public module option types with their Zod schemas and preserve runtime domain types in published runtime-owned locations.
- Updated dependencies [f78b723]
- Updated dependencies [91ebdd2]
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.2
  - @onderwijsin/nuxt-module-utils@0.4.0

## 0.4.1

### Patch Changes

- 71fa936: Import module setup utilities from the build subpath of module-utils
- Updated dependencies [8613ce0]
- Updated dependencies [b200d2a]
- Updated dependencies [da9bec4]
- Updated dependencies [71fa936]
- Updated dependencies [84be9dc]
  - @onderwijsin/nuxt-module-utils@0.3.0
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.1

## 0.4.0

### Minor Changes

- 4c70ca0: Harden public theme endpoints with configurable rate limits and validated, cached ColorFYI requests.

### Patch Changes

- 7e46f91: Synchronize module documentation and consumer skills with the current implementation.
- 5e3b6fb: Allow the theme customizer to use any installed version of the internal rate limiter module.
- Updated dependencies [7cb45c8]
- Updated dependencies [4c70ca0]
- Updated dependencies [76cb9d0]
- Updated dependencies [4810903]
- Updated dependencies [4c70ca0]
  - @onderwijsin/nuxt-module-utils@0.2.1
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.0

## 0.3.0

### Minor Changes

- c19384b: Preserve prefixed deployments in health checks and web manifests, make disabled newsletter signup
  inert, and namespace and harden theme customizer routes, components, palettes, and controls.

### Patch Changes

- 8c84b5d: Harden newsletter signup list authorization and Mailchimp member upserts, and prevent provider or
  external error details from exposing sensitive data in server logs.
- 132746b: Centralize conditional module dependency registration and apply the shared enablement contract
  consistently across the affected modules.
- Updated dependencies [438e854]
- Updated dependencies [132746b]
  - @onderwijsin/nuxt-module-utils@0.2.0

## 0.2.9

### Patch Changes

- 33bc382: Update module utility imports to the published `@onderwijsin/nuxt-module-utils` package.
- Updated dependencies [33bc382]
  - @onderwijsin/nuxt-module-utils@0.1.0

## 0.2.8

### Patch Changes

- ae69b48: Avoid registering theme customizer dependencies when the module is disabled.

## 0.2.7

### Patch Changes

- 5c1751f: Harden validation and runtime behavior across modules. Turnstile now requires the expected action,
  draft forms support arrays and dates, generated webmanifest icons honor requested formats, and
  health checks have bounded execution with safe public errors. Theme persistence validates stored
  data, and custom color tokens remain unique after mutations. The newsletter endpoint is rate
  limited through nuxt-api-shield, uses bounded provider requests, treats duplicate subscriptions as
  idempotent, and separates its browser and server runtime exports. Device removes the ineffective
  `refreshOnResize` option.

## 0.2.6

### Patch Changes

- 70ff6f1: Refactor module option validation to parse complete module-owned Zod schemas directly, with uniform validation error logging and typed validated options.
- ec29c96: Update module utils import to runtime dependent namespace
- 8bb6cd7: Added shared module utilities for runtime transpilation, typed object entry conversion, and consistent option validation. Updated consuming modules to use the shared helpers, preserve arbitrary option keys, and remove duplicated setup/validation logic. No public consumer API changes.

## 0.2.5

### Patch Changes

- bb5e548: Make custom color names and custom color groups editable. Add support for ciustom token values (eg default font, radius, primary color etc)

## 0.2.4

### Patch Changes

- 17c7443: Replace all $fetch instances with ofetch

## 0.2.3

### Patch Changes

- 8f2ed27: replace $fetch with ofetch in google fonts client

## 0.2.2

### Patch Changes

- 018ad25: Fix type template location and prevent type write skip in prepare mode

## 0.2.1

### Patch Changes

- f87eda6: Rename confirm dialog component and composable to namespaced files to prevent conflicts with consumers
- c39e4bc: Finetune prepare and packaging scripts

## 0.2.0

### Minor Changes

- 3f927e1: Add the publishable Nuxt UI theme customizer module with runtime theme
  selection, palette editor, playground, and consumer skill.

## 0.1.0

- First publishable version of the Nuxt UI theme picker.
