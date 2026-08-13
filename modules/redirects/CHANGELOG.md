# Changelog

## 0.2.2

### Patch Changes

- 6a005f8: Persist the client redirect store in browser localStorage instead of cookies.

## 0.2.1

### Patch Changes

- 473480b: Fix discovery of consumer redirect sources when the Nuxt server directory is customized.
- f78b723: Co-locate public module option types with their Zod schemas and preserve runtime domain types in published runtime-owned locations.
- Updated dependencies [91ebdd2]
  - @onderwijsin/nuxt-module-utils@0.4.0

## 0.2.0

### Minor Changes

- 8613ce0: Add provider-agnostic dynamic redirects with source discovery and Nitro storage indexing. Add a
  Node-only source-discovery helper for generated module registries.
- feefad3: Add opt-in `regexparam`-based dynamic redirect pattern matching.

### Patch Changes

- 71fa936: Import module setup utilities from the build subpath of module-utils
- aab3e76: Route redirect endpoint caches through the configured redirects storage mount and document the
  shared storage behavior.
- Updated dependencies [8613ce0]
- Updated dependencies [71fa936]
  - @onderwijsin/nuxt-module-utils@0.3.0

## 0.1.0

- Initial provider-agnostic redirects module.
