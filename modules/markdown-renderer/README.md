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
are discovered automatically and override the built-in `MarkdownButton`, `MarkdownCallout`, or
`MarkdownReference` component when the filename matches. `MarkdownReference` is registered in the
renderer as `Reference` so existing Directus Markdown continues to use `:Reference`.

```ts
export default defineNuxtConfig({
  markdownRenderer: {
    componentsDir: "renderer",
    componentSets: {
      article: ["MarkdownButton", "MarkdownCallout", "Video"],
      page: ["MarkdownButton", "MarkdownCallout", "Hero", "Video"]
    },
    resolveReferencePath: "~/utils/resolveReferencePath",
    corsOrigin: "https://directus.example.com"
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
because the Directus editor owns that reserved node. Responses are bare component arrays, which the
Directus extension accepts directly.

Metadata responses allow cross-origin browser requests by default with `corsOrigin: "*"`. Set one
origin or an array of origins to restrict access to known Directus installations. The endpoint also
handles browser `OPTIONS` preflight requests.

### Editor metadata

Prop types, descriptions, required/default state, literal union values, and JSDoc tags are inferred
by `nuxt-component-meta`. Use the module's `extendMarkdownComponent` compiler macro for
editor-specific information that cannot be inferred reliably, including a human label, block/inline
behavior, imported union values, or editor hints for complex props. Import the macro from Nuxt's
generated imports:

```vue
<script setup lang="ts">
import { extendMarkdownComponent } from "#imports";

extendMarkdownComponent({
  label: "Video player",
  description: "Embeds a hosted video.",
  type: "block",
  deprecated: { text: "Use MediaEmbed instead." },
  props: {
    provider: {
      values: ["vimeo", "youtube"]
    },
    poster: {
      input: "image"
    },
    website: {
      input: "url"
    },
    chapters: {
      type: "array",
      deprecated: true
    }
  }
});

defineProps<{
  /** Video provider. */
  provider: "vimeo" | "youtube";
  /** Chapter markers. */
  chapters?: Array<{ label: string; seconds: number }>;
  /** Optional Directus image ID. */
  poster?: string;
  /** Canonical video page. */
  website?: string;
}>();
</script>
```

The macro keeps the internal `markdownRenderer` namespace and tag representation out of component
code. `type` controls block/inline insertion. On props, `input: "image" | "url"` selects the richer
Directus control, while `deprecated: true | { text: string }` adds a deprecation hint with optional
migration guidance. Explicit `values`, `type`, `description`, `default`, and `required` override the
corresponding inferred prop metadata. The lower-level `extendComponentMeta` macro remains available
for metadata not represented by this convenience API.

## References

The built-in `MarkdownReference` handles persisted `:Reference` nodes and displays `text ?? label`.
Configure a default-exported resolver when a reference should become a link:

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
