# Changelog

## 0.2.0

### Minor Changes

- 44945f6: Add shared Directus instance, client, and sitemap option schemas.
- 44945f6: Add shared typed Directus configuration source discovery.
- 91ebdd2: Support standalone data-only sitemap collections with declarative field mapping while preserving executable shared mappers and fetchers.

### Patch Changes

- b7a6f6f: Remove stale build output before generating the published package artefacts.
- b7a6f6f: Make the generated server-config declaration resolve its public schema import from the package export.
- c5b960c: Resolve conditional Directus module dependencies from executable shared configuration during Nuxt dependency discovery.
- b1cd828: Make the package root and public subpath exports resolvable by Nuxt's CommonJS-compatible module loader.
- b7a6f6f: Keep executable Directus configuration and credentials out of client bundles.
- Updated dependencies [91ebdd2]
  - @onderwijsin/nuxt-module-utils@0.4.0

All notable changes to this project will be documented in this file.
