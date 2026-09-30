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
`MarkdownButton.vue`, `MarkdownCallout.vue`, or `MarkdownReference.vue` replaces that built-in.
`MarkdownReference` is exposed to the renderer as `Reference`, preserving persisted `:Reference`
syntax. Configure another directory name and named sets when needed:

```ts
export default defineNuxtConfig({
  markdownRenderer: {
    componentsDir: "markdown",
    componentSets: { article: ["MarkdownButton", "MarkdownCallout", "Video"] },
    resolveReferencePath: "~/utils/resolveReferencePath",
    corsOrigin: "https://directus.example.com"
  }
});
```

The directory is relative to `app/components/`. Components remain lazy through Comark's manifest.
The selected `component-set` constrains runtime resolution. Configure the Directus field's metadata
URL as `/api/markdown-renderer/components/<set>`. The endpoint omits reserved `Reference` metadata.
It returns the component metadata array directly and allows every browser origin by default. Use
`corsOrigin` with one origin or an origin array when the metadata API should only serve known
Directus installations.

For editor-only metadata, call the `nuxt-component-meta` `extendComponentMeta` macro in the renderer
component and namespace overrides below `markdownRenderer`. Use `label` for the human-facing label,
`nodeType: "block" | "inline"` for insertion behavior, and `props.<name>.values` for choices that
cannot be expanded from an imported TypeScript type. Component and prop `tags` are arrays of
`{ name, text? }`; use the same namespace for explicit complex-prop `type`, descriptions, defaults,
or required state. Ordinary prop types, JSDoc, defaults, literal unions, and tags remain inferred.

The reference resolver must default-export a function compatible with `ResolveReferencePath`, which
is importable from `@onderwijsin/nuxt-markdown-renderer/runtime`. If it is absent or returns
`undefined`, the built-in `MarkdownReference` renders `text ?? label` as plain text.

The module requires Nuxt 4 and Node.js 24 or newer. It is enabled by default and can be disabled
with `markdownRenderer: { enabled: false }`.
