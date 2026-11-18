# Changelog

## 0.4.7

### Patch Changes

- e708b2d: Stop installing or registering `@vueuse/nuxt` from Theme Customizer. The picker and editor import
  clipboard and debounced font-search utilities directly from the module's own `@vueuse/core`
  dependency. Applications can omit VueUse Nuxt integration or own it independently, including v15.

  **Upgrade and retain the required peers**

  Use Node.js 24 or newer and Nuxt 4. Upgrade the module:

  ```sh
  pnpm add @onderwijsin/nuxt-theme-customizer@0.4.7
  ```

  The application still owns Nuxt UI `^4.6.1`, `@pinia/nuxt` `^1.0.1`, Pinia `^4.0.2`,
  `pinia-plugin-persistedstate` `^4.7.1`, and Vue `^3.5.0`. Retain compatible installed versions. If
  peers are missing or incompatible, install compatible versions explicitly:

  ```sh
  pnpm add '@nuxt/ui@^4.6.1' '@pinia/nuxt@^1.0.1' 'pinia@^4.0.2' \
    'pinia-plugin-persistedstate@^4.7.1' 'vue@^3.5.0'
  ```

  Keep these application-owned runtime packages shared with the rest of the application. Nuxt UI,
  Pinia, and persisted-state registration remains automatic when the customizer is enabled.

  **Choose whether the application needs VueUse auto-imports**

  If you only use the customizer's picker/editor and your own code does not need VueUse auto-imports,
  no new VueUse dependency or module registration is required. If your manifest lists `@vueuse/nuxt`
  solely for the customizer and nothing else uses it, you may remove that direct dependency and its
  module entry.

  If application code previously relied on the customizer's transitive VueUse auto-imports, install
  and register the integration yourself. To retain the previously tested v14 integration:

  ```sh
  pnpm add @vueuse/nuxt@14.4.0
  ```

  Or use the tested v15 integration when appropriate for your application:

  ```sh
  pnpm add @vueuse/nuxt@15.0.0
  ```

  Keep an existing compatible integration version rather than downgrading it for the customizer. Merge
  its registration into the existing configuration, preserving your palettes and other options:

  ```ts
  export default defineNuxtConfig({
    modules: ["@vueuse/nuxt", "@onderwijsin/nuxt-theme-customizer"],
    // Preserve existing themeCustomizer options and stylesheet imports.
  });
  ```

  If your application imports utilities directly from `@vueuse/core`, also declare its own compatible
  `@vueuse/core` dependency rather than importing through a transitive installation. For the v15
  example use `pnpm add @vueuse/core@15.0.0`; for v14.4.0 use `pnpm add @vueuse/core@14.4.0`. The
  customizer's private utility dependency can remain on its own version; do not force it to match the
  application's VueUse integration. Remove an old VueUse version override only if it existed solely to
  satisfy the customizer's previous integration constraint.

  **Verify the upgrade**

  Resolve unmet peer requirements and commit the updated application manifest and lockfile together.
  Regenerate types with `pnpm exec nuxt prepare`, run your application's typecheck, and run
  `pnpm exec nuxt build`. Check any application VueUse auto-imports, the theme picker, `/thema` (or
  your configured editor route), clipboard copying, debounced font search, and persisted selections.
  Keep existing complete primary palettes and CSS imports. Production behavior still requires
  `themeCustomizer.enabled: true` when you want the editor/picker available outside development.

- Updated dependencies [e708b2d]
  - @onderwijsin/nuxt-module-utils@0.5.2

## 0.4.6

### Patch Changes

- 0381721: Transpile the application-owned Pinia runtime through Nuxt so Pinia 4’s Vue compile-time flags are resolved during SSR. Keep server-only Redirects configurations independent of Pinia.
- 0381721: Use application-owned @nuxt/ui, @pinia/nuxt, pinia, pinia-plugin-persistedstate, vue peer dependencies to preserve shared runtime identity. Keep exact catalog-pinned development installations and automatic Nuxt module registration.

## 0.4.5

### Patch Changes

- 775c67e: Allow numeric `defaults.radius` values alongside string theme defaults in the public options type.

## 0.4.4

### Patch Changes

- 451c582: Preserve existing consumer and layer runtime-config namespace values during module setup.
- 451c582: Raise the supported and validated Node.js baseline to Node.js 24.
- Updated dependencies [1e30fbb]
- Updated dependencies [451c582]
  - @onderwijsin/nuxt-module-utils@0.5.1
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.4

## 0.4.3

### Patch Changes

- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
  - @onderwijsin/nuxt-module-utils@0.5.0
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.3

## 0.4.2

### Patch Changes

- f78b723: Co-locate public module option types with their Zod schemas and preserve runtime domain types in published runtime-owned locations.
- Updated dependencies [f78b723]
- Updated dependencies [91ebdd2]
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.2
  - @onderwijsin/nuxt-module-utils@0.4.0

## 0.4.1

### Patch Changes

- 71fa936: Import module setup utilities from the build subpath of module-utils
- Updated dependencies [8613ce0]
- Updated dependencies [b200d2a]
- Updated dependencies [da9bec4]
- Updated dependencies [71fa936]
- Updated dependencies [84be9dc]
  - @onderwijsin/nuxt-module-utils@0.3.0
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.1

## 0.4.0

### Minor Changes

- 4c70ca0: Harden public theme endpoints with configurable rate limits and validated, cached ColorFYI requests.

### Patch Changes

- 7e46f91: Synchronize module documentation and consumer skills with the current implementation.
- 5e3b6fb: Allow the theme customizer to use any installed version of the internal rate limiter module.
- Updated dependencies [7cb45c8]
- Updated dependencies [4c70ca0]
- Updated dependencies [76cb9d0]
- Updated dependencies [4810903]
- Updated dependencies [4c70ca0]
  - @onderwijsin/nuxt-module-utils@0.2.1
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.0

## 0.3.0

### Minor Changes

- c19384b: Preserve prefixed deployments in health checks and web manifests, make disabled newsletter signup
  inert, and namespace and harden theme customizer routes, components, palettes, and controls.

### Patch Changes

- 8c84b5d: Harden newsletter signup list authorization and Mailchimp member upserts, and prevent provider or
  external error details from exposing sensitive data in server logs.
- 132746b: Centralize conditional module dependency registration and apply the shared enablement contract
  consistently across the affected modules.
- Updated dependencies [438e854]
- Updated dependencies [132746b]
  - @onderwijsin/nuxt-module-utils@0.2.0

## 0.2.9

### Patch Changes

- 33bc382: Update module utility imports to the published `@onderwijsin/nuxt-module-utils` package.
- Updated dependencies [33bc382]
  - @onderwijsin/nuxt-module-utils@0.1.0

## 0.2.8

### Patch Changes

- ae69b48: Avoid registering theme customizer dependencies when the module is disabled.

## 0.2.7

### Patch Changes

- 5c1751f: Harden validation and runtime behavior across modules. Turnstile now requires the expected action,
  draft forms support arrays and dates, generated webmanifest icons honor requested formats, and
  health checks have bounded execution with safe public errors. Theme persistence validates stored
  data, and custom color tokens remain unique after mutations. The newsletter endpoint is rate
  limited through nuxt-api-shield, uses bounded provider requests, treats duplicate subscriptions as
  idempotent, and separates its browser and server runtime exports. Device removes the ineffective
  `refreshOnResize` option.

## 0.2.6

### Patch Changes

- 70ff6f1: Refactor module option validation to parse complete module-owned Zod schemas directly, with uniform validation error logging and typed validated options.
- ec29c96: Update module utils import to runtime dependent namespace
- 8bb6cd7: Added shared module utilities for runtime transpilation, typed object entry conversion, and consistent option validation. Updated consuming modules to use the shared helpers, preserve arbitrary option keys, and remove duplicated setup/validation logic. No public consumer API changes.

## 0.2.5

### Patch Changes

- bb5e548: Make custom color names and custom color groups editable. Add support for ciustom token values (eg default font, radius, primary color etc)

## 0.2.4

### Patch Changes

- 17c7443: Replace all $fetch instances with ofetch

## 0.2.3

### Patch Changes

- 8f2ed27: replace $fetch with ofetch in google fonts client

## 0.2.2

### Patch Changes

- 018ad25: Fix type template location and prevent type write skip in prepare mode

## 0.2.1

### Patch Changes

- f87eda6: Rename confirm dialog component and composable to namespaced files to prevent conflicts with consumers
- c39e4bc: Finetune prepare and packaging scripts

## 0.2.0

### Minor Changes

- 3f927e1: Add the publishable Nuxt UI theme customizer module with runtime theme
  selection, palette editor, playground, and consumer skill.

## 0.1.0

- First publishable version of the Nuxt UI theme picker.
