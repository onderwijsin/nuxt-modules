# Changelog

## 0.2.10

### Patch Changes

- 451c582: Raise the supported and validated Node.js baseline to Node.js 24.
- Updated dependencies [1e30fbb]
- Updated dependencies [451c582]
  - @onderwijsin/nuxt-module-utils@0.5.1

## 0.2.9

### Patch Changes

- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
  - @onderwijsin/nuxt-module-utils@0.5.0

## 0.2.8

### Patch Changes

- f78b723: Co-locate public module option types with their Zod schemas and preserve runtime domain types in published runtime-owned locations.
- Updated dependencies [91ebdd2]
  - @onderwijsin/nuxt-module-utils@0.4.0

## 0.2.7

### Patch Changes

- 71fa936: Import module setup utilities from the build subpath of module-utils
- Updated dependencies [8613ce0]
- Updated dependencies [71fa936]
  - @onderwijsin/nuxt-module-utils@0.3.0

## 0.2.6

### Patch Changes

- 438e854: Add shared primitive runtime guards, including `isFunction`, and migrate repeated module-local checks to the new API.
- Updated dependencies [438e854]
- Updated dependencies [132746b]
  - @onderwijsin/nuxt-module-utils@0.2.0

## 0.2.5

### Patch Changes

- 33bc382: Update module utility imports to the published `@onderwijsin/nuxt-module-utils` package.
- Updated dependencies [33bc382]
  - @onderwijsin/nuxt-module-utils@0.1.0

## 0.2.4

### Patch Changes

- ae69b48: Document the `$t` incompatibility with Vue I18n and Nuxt I18n.

## 0.2.3

### Patch Changes

- 70ff6f1: Refactor module option validation to parse complete module-owned Zod schemas directly, with uniform validation error logging and typed validated options.
- 1800ad7: adopt shared module setup pattern
- 8bb6cd7: Added shared module utilities for runtime transpilation, typed object entry conversion, and consistent option validation. Updated consuming modules to use the shared helpers, preserve arbitrary option keys, and remove duplicated setup/validation logic. No public consumer API changes.

## 0.2.2

### Patch Changes

- 018ad25: Fix type template location and prevent type write skip in prepare mode

## 0.2.1

### Patch Changes

- c39e4bc: Finetune prepare and packaging scripts

## 0.2.0

### Minor Changes

- 7890028: Rename the package to `@onderwijsin/nuxt-static-text` and add the publishable Nuxt static-text module with typed dotted-key lookup, deep dictionary support, placeholder interpolation, validated `app/`-relative content paths, tests, and a Nuxt playground.

All notable changes to this package will be documented in this file.

## 0.1.0

- Initial publishable release.
