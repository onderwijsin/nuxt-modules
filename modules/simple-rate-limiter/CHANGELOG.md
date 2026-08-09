# Changelog

## 0.4.0

### Minor Changes

- 76cb9d0: Move Nitro pruning task registration and scheduling to consumers while providing a reusable task handler.
- 4810903: Make global rate-limit storage opt-in and add optional Nitro pruning for stale global records.

### Patch Changes

- 4c70ca0: Return the active rolling-window expiry when global limiting has no explicit ban.
- 4c70ca0: Make forwarded client IP trust opt-in and document the deployment security boundary.

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
