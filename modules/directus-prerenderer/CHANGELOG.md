# Changelog

## 0.3.0

### Minor Changes

- a369c8a: Rename the shared Directus instance credential from `staticToken` to `proxyToken` and document its delegated public-proxy permissions.

### Patch Changes

- Updated dependencies [a369c8a]
- Updated dependencies [1673d1c]
- Updated dependencies [1f5e6f5]
- Updated dependencies [a369c8a]
- Updated dependencies [e09f2ae]
- Updated dependencies [a369c8a]
  - @onderwijsin/nuxt-directus-config@0.8.0

## 0.2.3

### Patch Changes

- Updated dependencies [693e00e]
  - @onderwijsin/nuxt-directus-config@0.7.0

## 0.2.2

### Patch Changes

- Updated dependencies [8927938]
  - @onderwijsin/nuxt-directus-config@0.6.0

## 0.2.1

### Patch Changes

- 451c582: Raise the supported and validated Node.js baseline to Node.js 24.
- Updated dependencies [de57301]
- Updated dependencies [1e30fbb]
- Updated dependencies [451c582]
  - @onderwijsin/nuxt-directus-config@0.5.0
  - @onderwijsin/nuxt-module-utils@0.5.1

## 0.2.0

### Minor Changes

- 979e8f3: Add Directus-backed Nuxt prerender route discovery with configurable fetchers and mappers.

### Patch Changes

- 979e8f3: Initialize shared Directus configuration before dependent modules when the config module is registered.
- 979e8f3: Share the typed Directus REST client factory across Directus modules and isolate best-effort
  prerender failures to the collection page that failed.
- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
  - @onderwijsin/nuxt-directus-config@0.4.0
  - @onderwijsin/nuxt-module-utils@0.5.0
