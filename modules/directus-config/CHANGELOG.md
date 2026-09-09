# Changelog

## 0.9.0

### Minor Changes

- 0910b57: Separate stable authentication facts from mutable current-user data. The auth snapshot contains
  only `userId` and `requiresTfaSetup`; configure `client.auth.user.fields` for profile data and use
  `useDirectusUser()` to fetch it, optionally map it server-side, and refresh it after profile
  mutations. The browser and SSR use the same current-user route, including SSR session-cookie
  rotation.

### Patch Changes

- 0910b57: Generate the current-user response type from its selected fields or executable mapper, including
  custom `directus_users` fields when schema type generation is enabled. Preserve the generated type
  through the composable declaration, and type standard mapper input fields from the Directus SDK.

## 0.8.0

### Minor Changes

- a369c8a: Allow configuring a custom upstream base URL for Directus asset proxy requests.
- 1673d1c: Add opt-in pruning for stale Directus asset-cache entries, with throttled request cleanup and an exported consumer-owned Nitro task.
- 1f5e6f5: Disable Directus preview query handling by default; applications must explicitly enable the preview option.
- e09f2ae: Remove the project-specific `CandidateStatuse` type-name override and the unused `applyTypeNameOverrides` configuration option from Directus type generation.
- a369c8a: Rename the shared Directus instance credential from `staticToken` to `proxyToken` and document its delegated public-proxy permissions.

### Patch Changes

- a369c8a: Make Directus refresh requests single-attempt and preserve sessions during transient refresh failures.

## 0.7.0

### Minor Changes

- 693e00e: Add optional `ocache`-backed caching for public anonymous Directus assets using an application-provided Nitro storage mount.

## 0.6.0

### Minor Changes

- 8927938: Add a dedicated Directus assets proxy with anonymous-first, session-escalating authentication and configurable public-only behavior.

## 0.5.2

### Patch Changes

- 6d438f7: Remove the temporary `client.nuxtBaseUrl` option from the Directus client and shared Directus
  configuration schemas.

  Authentication no longer needs an application base URL because SSR operations execute through the
  request-bound server bridge, while browser operations continue to use relative same-origin proxy
  paths. Consumers should remove `client.nuxtBaseUrl` from their configuration.

## 0.5.1

### Patch Changes

- d225f8f: Use an absolute Nuxt application URL for server-side Directus authentication proxy requests while preserving relative same-origin browser requests.
- 70baa65: Include the discovered `directus.config.ts` in Nuxt's generated Node TypeScript project so ambient
  environment types remain available in IDEs.

## 0.5.0

### Minor Changes

- de57301: Add optional `client.auth.magicLinks` configuration with a fixed, validated server-only callback
  URL. Enabling magic links requires authentication to be enabled.

### Patch Changes

- 451c582: Raise the supported and validated Node.js baseline to Node.js 24.
- Updated dependencies [1e30fbb]
- Updated dependencies [451c582]
  - @onderwijsin/nuxt-module-utils@0.5.1

## 0.4.0

### Minor Changes

- 979e8f3: Add shared Directus collection configuration for build-time prerender routes.

### Patch Changes

- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
  - @onderwijsin/nuxt-module-utils@0.5.0

## 0.3.0

### Minor Changes

- d4460bc: Add shared sitemap options for bounded Directus query pages and collection fetch failure handling.
- 300d504: Add server-only Directus session sealing secrets, previous-key rotation settings, and the playground
  secret-masking option to shared configuration.

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
