# Changelog

## 0.4.4

### Patch Changes

- 451c582: Raise the supported and validated Node.js baseline to Node.js 24.
- Updated dependencies [1e30fbb]
- Updated dependencies [451c582]
  - @onderwijsin/nuxt-module-utils@0.5.1

## 0.4.3

### Patch Changes

- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
  - @onderwijsin/nuxt-module-utils@0.5.0

## 0.4.2

### Patch Changes

- f78b723: Co-locate public module option types with their Zod schemas and preserve runtime domain types in published runtime-owned locations.
- Updated dependencies [91ebdd2]
  - @onderwijsin/nuxt-module-utils@0.4.0

## 0.4.1

### Patch Changes

- b200d2a: Align the simple rate limiter with the repository's shared Nuxt module setup lifecycle and runtime registration patterns.
- da9bec4: Validate Mailchimp server prefixes and clarify that the simple rate limiter provides best-effort,
  non-security-boundary protection.
- 84be9dc: Add runtime config type augmentation and fix tsconfig extends path
- Updated dependencies [8613ce0]
- Updated dependencies [71fa936]
  - @onderwijsin/nuxt-module-utils@0.3.0

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
