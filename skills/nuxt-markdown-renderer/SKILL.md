---
name: nuxt-markdown-renderer
description:
  Integrate, configure, extend, or troubleshoot @onderwijsin/nuxt-markdown-renderer in Nuxt 4
  applications. Use for Markdown/MDC rendering, custom renderer components, Directus editor
  metadata, component sets, reference links, and video-source transformations.
---

# Nuxt Markdown Renderer

Use `@onderwijsin/nuxt-markdown-renderer` to render Markdown and MDC with Comark, Nuxt UI Prose,
lazy application components, and metadata for the Directus Markdown editor.

## Start here

1. Inspect the application's Nuxt configuration, main CSS, renderer components, and stored MDC
   before changing integration. Preserve persisted component names, especially `Reference`.
2. Use the setup below, then read the reference that matches the task:
   - [Configuration and rendering](references/configuration-and-rendering.md): every module option,
     renderer prop, built-in component prop, MDC syntax, component sets, plugins, and video URLs.
   - [Custom components and editor metadata](references/editor-components.md): component discovery,
     overrides, the complete editor macro API, nested fields, and the Directus endpoint.
   - [Reference links and troubleshooting](references/references-and-troubleshooting.md): the public
     resolver type, persisted reference syntax, disabled behavior, and diagnostic checks.
3. Use public package imports and Nuxt auto-imports in application code. The supported runtime
   export is the `ResolveReferencePath` type from `@onderwijsin/nuxt-markdown-renderer/runtime`.
   Keep editor schema calls static in renderer SFCs so the compiler can extract them.
4. Check the application's rendered content and, for editor changes, the actual metadata response.
   An editor label does not rename a Markdown node; a component set controls runtime resolution as
   well as editor choices. The reserved `Reference` node always resolves regardless of the set and
   remains excluded from metadata.

All references are bundled with this skill and remain usable when installed outside this repository.

## Install and register

Requires Nuxt 4 and Node.js 24 or newer. Vue `^3.5.0`, Nuxt UI `^4.0.0`, and `@comark/nuxt`,
`@comark/vue`, and `comark` `>=0.6.2` are peer dependencies.

Use the application's Vue runtime and keep all three Comark packages on the same version. Separate
Vue copies can cause missing Prose styles and SSR hydration mismatches.

```sh
pnpm add @onderwijsin/nuxt-markdown-renderer @nuxt/ui @comark/nuxt @comark/vue comark
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"],
  css: ["~/assets/css/main.css"]
});
```

```css
/* app/assets/css/main.css */
@import "tailwindcss";
@import "@nuxt/ui";
@import "@onderwijsin/nuxt-markdown-renderer";
```

```vue
<script setup lang="ts">
const content = "# Welcome\n\nRead **Markdown** and MDC in your Nuxt application.";
</script>

<template>
  <MarkdownRenderer :value="content" />
</template>
```

## Integration constraints

- Put custom components directly in `app/components/renderer/`, or the configured directory below
  `app/components/`. Nested files are not discovered.
- Use registered Markdown node names in MDC and `componentSets`, not editor labels. The built-in
  `MarkdownReference` is registered as `Reference`.
- Import `defineEditorComponentSchema` from `#imports` in custom renderer SFCs. Its top-level field
  map is `properties`; the metadata HTTP response uses `props`.
- Special editor inputs (`image`, `url`, `icon`) require inferred string props, including nested
  fields. Icon inputs require a non-empty `collections` array.
- The metadata endpoint is public. `corsOrigin` controls browser access and provides no
  authentication.
- `scopeComponentMeta: true` scopes the application's global metadata parser. Set it to `false` when
  unrelated application components also need extraction.
