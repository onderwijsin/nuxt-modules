# Changelog

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
