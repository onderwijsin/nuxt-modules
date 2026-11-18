---
"@onderwijsin/nuxt-theme-customizer": patch
---

Stop installing or registering `@vueuse/nuxt` from Theme Customizer. The picker and editor import
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
  modules: ["@vueuse/nuxt", "@onderwijsin/nuxt-theme-customizer"]
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
