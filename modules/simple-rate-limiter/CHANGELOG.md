# Changelog

## 0.3.0

### Minor Changes

- 40c6668: Add global per-IP rate limiting and make exceeded limits consistently throw 429 errors with a
  `bannedUntil` timestamp and active limit configuration.

## 0.2.1

### Patch Changes

- 33bc382: Update module utility imports to the published `@onderwijsin/nuxt-module-utils` package.

## 0.2.0

### Minor Changes

- 48013e2: Add a path-scoped, server-side rate limiter and use it for newsletter signup protection.

## 0.1.0

- Initial release.
