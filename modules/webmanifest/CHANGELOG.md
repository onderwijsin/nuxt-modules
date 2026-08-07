# Changelog

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
