# Changelog

## 0.5.0

### Minor Changes

- 979e8f3: Share the typed Directus REST client factory across Directus modules and isolate best-effort
  prerender failures to the collection page that failed.
- 979e8f3: Add a shared Nuxt-scoped cache for Directus module setup operations.

### Patch Changes

- 979e8f3: Make module utility subpath exports resolvable by Nuxt's CommonJS-compatible module loader.

## 0.4.0

### Minor Changes

- 91ebdd2: Add the typed `keys` helper to the shared module utilities.

## 0.3.1

### Patch Changes

- 743f501: Add attemptSync utility

## 0.3.0

### Minor Changes

- 8613ce0: Add provider-agnostic dynamic redirects with source discovery and Nitro storage indexing. Add a
  Node-only source-discovery helper for generated module registries.

### Patch Changes

- 71fa936: Import module setup utilities from the build subpath of module-utils

## 0.2.1

### Patch Changes

- 7cb45c8: Share administrator authentication between cache invalidation and storage administration.

## 0.2.0

### Minor Changes

- 438e854: Add shared primitive runtime guards, including `isFunction`, and migrate repeated module-local checks to the new API.

### Patch Changes

- 132746b: Centralize conditional module dependency registration and apply the shared enablement contract
  consistently across the affected modules.

## 0.1.0

### Minor Changes

- 33bc382: Publish the shared Nuxt module and runtime utilities as `@onderwijsin/nuxt-module-utils`.

## 0.1.0 (unreleased)

- Publish the shared Nuxt module and runtime utilities.
