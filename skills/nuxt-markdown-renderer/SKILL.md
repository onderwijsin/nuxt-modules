# Nuxt Markdown Renderer

Use `@onderwijsin/nuxt-markdown-renderer` to render Markdown/MDC with Comark, Nuxt UI Prose, lazy
application components, and Directus-editor component metadata.

## Setup

```sh
pnpm add @onderwijsin/nuxt-markdown-renderer
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"]
});
```

## Component

```vue
<template>
  <MarkdownRenderer :value="article.content" component-set="article" />
</template>
```

Place renderer components directly in `app/components/renderer/`. A consumer component named
`Button.vue`, `Callout.vue`, or `Reference.vue` replaces that built-in. Configure another directory
name and named sets when needed:

```ts
export default defineNuxtConfig({
  markdownRenderer: {
    componentsDir: "markdown",
    componentSets: { article: ["Button", "Callout", "Video"] },
    resolveReferencePath: "~/utils/resolveReferencePath"
  }
});
```

The directory is relative to `app/components/`. Components remain lazy through Comark's manifest.
The selected `component-set` constrains runtime resolution. Configure the Directus field's metadata
URL as `/api/markdown-renderer/components/<set>`. The endpoint omits reserved `Reference` metadata.

The reference resolver must default-export a function compatible with `ResolveReferencePath`, which
is importable from `@onderwijsin/nuxt-markdown-renderer/runtime`. If it is absent or returns
`undefined`, the built-in `Reference` renders `text ?? label` as plain text.

The module requires Nuxt 4 and Node.js 24 or newer. It is enabled by default and can be disabled
with `markdownRenderer: { enabled: false }`.
