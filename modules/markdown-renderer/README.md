# @onderwijsin/nuxt-markdown-renderer

Nuxt 4 module that renders Markdown and MDC with Comark, Nuxt UI Prose, lazy custom components, and
component metadata for the Directus Markdown editor.

## Install and register

```sh
pnpm add @onderwijsin/nuxt-markdown-renderer
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"]
});
```

Use the component in any Nuxt template:

```vue
<template>
  <MarkdownRenderer :value="article.content" component-set="article" />
</template>
```

The module requires Nuxt 4 and Node.js 24 or newer.

## Configuration

The module is enabled by default. Renderer components placed directly in `app/components/renderer/`
are discovered automatically and override the built-in `Button`, `Callout`, or `Reference` component
when the filename matches.

```ts
export default defineNuxtConfig({
  markdownRenderer: {
    componentsDir: "renderer",
    componentSets: {
      article: ["Button", "Callout", "Video"],
      page: ["Button", "Callout", "Hero", "Video"]
    },
    resolveReferencePath: "~/utils/resolveReferencePath"
  }
});
```

`componentsDir` is relative to `app/components/`. Components are loaded lazily through Comark's
component manifest. Selecting `component-set` on `MarkdownRenderer` limits the components available
to that configured set; omit it to allow every discovered component.

The module exposes editor-compatible component metadata at:

```text
/api/markdown-renderer/components/article
/api/markdown-renderer/components/page
```

The endpoint without a set returns all discovered components. `Reference` is deliberately omitted
because the Directus editor owns that reserved node.

## References

The built-in `Reference` displays `text ?? label`. Configure a default-exported resolver when a
reference should become a link:

```ts
// app/utils/resolveReferencePath.ts
import type { ResolveReferencePath } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const resolveReferencePath: ResolveReferencePath = (collection, item, _label, _text, data) => {
  if (collection === "articles") return `/articles/${String(data?.slug ?? item)}`;
};

export default resolveReferencePath;
```

Without a resolver, or when it returns `undefined`, the reference renders as plain text. The module
never guesses an application route.

Disable setup with:

```ts
export default defineNuxtConfig({
  markdownRenderer: { enabled: false }
});
```

## Development

```sh
pnpm --filter markdown-renderer-playground dev
pnpm --filter markdown-renderer-playground typecheck
```
