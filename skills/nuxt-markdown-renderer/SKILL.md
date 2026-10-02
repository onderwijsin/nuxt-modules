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

In the consuming application's main CSS file, import the module stylesheet:

```css
@import "tailwindcss";
@import "@nuxt/ui";
@import "@onderwijsin/nuxt-markdown-renderer";
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
syntax. Custom files must be direct children of the configured directory; nested files are not
discovered.

The built-in button's icon editor metadata uses the `lucide` collection by default. For other icon
collections, override the relevant renderer component and define its own
`defineEditorComponentSchema` with the desired `collections` for each icon input.

Configure another directory name and named sets when needed:

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
Component-set entries use registered Markdown node names. The selected `component-set` constrains
runtime resolution; an unknown set's metadata endpoint returns 404. Configure the Directus field's
metadata URL as `/api/markdown-renderer/components/<set>`. The endpoint omits reserved `Reference`
metadata and returns the component metadata array directly.

The endpoint is public and allows every browser origin by default. CORS is not authentication. Use
`corsOrigin` with one exact origin or an origin array when deployment policy requires a narrower
allowlist.

For editor-only metadata, import and call `defineEditorComponentSchema` from `#imports` in the
renderer component. Use `label` for the human-facing label, `type: "block" | "inline"` for insertion
behavior, and `properties.<name>.values` for choices that cannot be expanded from an imported
TypeScript type. Use `input: "image" | "url"`, their equivalent object forms (`{ type: "image" }`
and `{ type: "url" }`), or `input: { type: "icon", collections: ["lucide"] }` for richer Directus
controls and `deprecated: true | string | { text: string }` for component or prop deprecation hints.
Guidance strings must be non-empty. Explicit complex-prop `type`, descriptions, defaults, or
required state are also supported. Object fields appear under `properties`, and array item fields
under `items`; use those same keys in the macro for nested overrides such as
`properties.image.properties.src.input: "image"` or
`properties.actions.items.properties.to.input: "url"`. These special inputs require an inferred
string prop; incompatible types cause the metadata endpoint to report the component and property
path. The endpoint emits them as `specialInputType` tags. Ordinary prop types, nested structure,
JSDoc, defaults, literal unions, and tags remain inferred. Invalid macro configuration produces a
build warning with the nested field path and is ignored for that component until corrected. Use
`properties` at the macro's top level and for nested object fields. The metadata endpoint still
returns component fields under `props`. Built-in components retain JSDoc descriptions, defaults,
slots, nested prop fields, and editor tags in the generated metadata; the module reads their
packaged typed Vue sources for inference and macro metadata.

Use the registered component name in MDC, for example:

```md
::MarkdownHero{title="Welcome" align="center"} Editable **Markdown** in the default slot. ::
```

The reference resolver must default-export a function compatible with `ResolveReferencePath`, which
is importable from `@onderwijsin/nuxt-markdown-renderer/runtime`. If it is absent or returns
`undefined`, the built-in `MarkdownReference` renders `text ?? label` as plain text.

The module requires Nuxt 4 and Node.js 24 or newer. It is enabled by default and can be disabled
with `markdownRenderer: { enabled: false }`. Disabling it keeps prepare-time declarations but does
not register runtime components, auto-imports, templates, or routes.

It can be used alongside `@onderwijsin/nuxt-webmanifest` and Schema.org components without
installing `@unhead/schema-org` separately; built-in and consumer renderer metadata remain
available.

## Video sources and plugins

Configure `markdownRenderer.videoBaseUrl` with an absolute URL, such as
`https://media.example.com/assets/`, to prefix relative `video` node sources.
`:video{src="clip.mp4" controls}` and a source of `/clip.mp4` both resolve beneath that base. URLs
with a protocol (including `blob:` and `data:`) and protocol-relative sources remain unchanged. Only
string `src` attributes on `video` nodes are rewritten; nested `source` elements are unchanged. Omit
the option to preserve sources and leave the built-in plugin unloaded.

Pass initialized `ComarkPlugin[]` through the `MarkdownRenderer` `plugins` prop for additional
transformations. Caller plugins run before the built-in video-source plugin, and their array is not
mutated. The video plugin and base URL are selected when the renderer is created; remount it after
changing video configuration.

## Component metadata scope

`markdownRenderer.scopeComponentMeta` defaults to `true`. The application's global
`nuxt-component-meta` parser processes only built-in renderer components and direct children of
`app/components/<componentsDir>/`, using packaged typed sources for built-in metadata.

If your application uses `nuxt-component-meta` for unrelated components, retain its normal global
behavior with:

```ts
export default defineNuxtConfig({
  markdownRenderer: { scopeComponentMeta: false }
});
```

Disabling scoping preserves your component-meta component and directory configuration while keeping
built-in renderer source enrichment. Global metadata extraction can have significantly higher build
time and memory costs.
