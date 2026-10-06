# @onderwijsin/nuxt-markdown-renderer

Nuxt 4 module for rendering Markdown and MDC with Comark, Nuxt UI Prose, lazy application
components, and component metadata for the Directus Markdown editor.

## Features

- Renders Markdown and MDC through the global `MarkdownRenderer` component.
- Includes `MarkdownButton`, `MarkdownCallout`, and the persisted `Reference` node.
- Discovers application renderer components through Nuxt's component registry.
- Lazily imports custom components and optionally restricts them with named component sets.
- Exposes Directus-compatible component metadata, including CORS preflight handling.
- Provides a typed compiler macro for editor labels, node types, choices, input controls, and
  deprecation hints.

## Requirements

- Nuxt `^4.0.0`
- Node.js 24 or newer
- Vue `^3.5.0`, Nuxt UI `^4.0.0`, and `@comark/nuxt`, `@comark/vue`, and `comark` `>=0.6.2` are peer
  dependencies.

The renderer can be used alongside `@onderwijsin/nuxt-webmanifest` and Schema.org components without
installing `@unhead/schema-org` separately. Renderer component metadata remains available.

Use the application's Vue runtime and keep all three Comark packages on the same version. Separate
Vue copies can cause missing Prose styles and SSR hydration mismatches.

## Installation

```sh
pnpm add @onderwijsin/nuxt-markdown-renderer @nuxt/ui @comark/nuxt @comark/vue comark
```

Register the module:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"]
});
```

Import the module stylesheet in the consuming application's main CSS file after `@nuxt/ui`:

```css
@import "tailwindcss";
@import "@nuxt/ui";
@import "@onderwijsin/nuxt-markdown-renderer";
```

## Render Markdown

`MarkdownRenderer` accepts the Markdown source and an optional named component set:

```vue
<template>
  <MarkdownRenderer :value="article.content" component-set="article" />
</template>
```

| Prop           | Type             | Default     | Description                                     |
| -------------- | ---------------- | ----------- | ----------------------------------------------- |
| `value`        | `string`         | `undefined` | Markdown or MDC source.                         |
| `plugins`      | `ComarkPlugin[]` | `undefined` | Additional initialized Comark plugins.          |
| `componentSet` | `string`         | `undefined` | Optional configured custom-component allowlist. |

The built-in MDC nodes are:

| Markdown node     | Vue implementation  | Editor label | Behavior                                     |
| ----------------- | ------------------- | ------------ | -------------------------------------------- |
| `MarkdownButton`  | `MarkdownButton`    | Button       | Inline Nuxt UI button or link.               |
| `MarkdownCallout` | `MarkdownCallout`   | Callout      | Block Nuxt UI alert with editable content.   |
| `Reference`       | `MarkdownReference` | —            | Directus item reference; excluded from menu. |

The built-in button's icon editor metadata uses the `lucide` collection by default. To offer other
icon collections in component metadata, override the relevant renderer component and define its own
`defineEditorComponentSchema` with the desired `collections` for each icon input.

For example:

```md
::MarkdownCallout{title="Before you continue" color="warning"} Read the
:MarkdownButton{label="documentation" to="/docs" variant="soft"}. ::
```

## Configuration

```ts
export default defineNuxtConfig({
  markdownRenderer: {
    enabled: true,
    scopeComponentMeta: true,
    componentsDir: "renderer",
    componentSets: {
      article: ["MarkdownButton", "MarkdownCallout", "MarkdownHero"],
      landing: ["MarkdownButton", "MarkdownHero"]
    },
    resolveReferencePath: "~/utils/resolveReferencePath",
    videoBaseUrl: "https://media.example.com/assets/",
    corsOrigin: "https://directus.example.com"
  }
});
```

| Option                 | Type                       | Default      | Description                                                       |
| ---------------------- | -------------------------- | ------------ | ----------------------------------------------------------------- |
| `enabled`              | `boolean`                  | `true`       | Enables component, manifest, and metadata endpoint registration.  |
| `scopeComponentMeta`   | `boolean`                  | `true`       | Limits global component metadata extraction to renderer sources.  |
| `componentsDir`        | `string`                   | `"renderer"` | Directory below `app/components/` containing renderer components. |
| `componentSets`        | `Record<string, string[]>` | `{}`         | Named allowlists used by rendering and metadata endpoints.        |
| `resolveReferencePath` | `string`                   | unset        | Nuxt-resolvable path to a default-exported Reference resolver.    |
| `videoBaseUrl`         | `string`                   | unset        | Absolute base URL for relative video sources.                     |
| `corsOrigin`           | `string \| string[]`       | `"*"`        | Origins allowed to call the metadata endpoint from a browser.     |

A single `corsOrigin` string is accepted and normalized to an allowlist. Use `"null"` only when a
sandboxed or local client intentionally sends an opaque origin.

## Video sources and plugins

Set `markdownRenderer.videoBaseUrl` to an absolute URL to prefix relative `video` sources:

```md
:video{src="clip.mp4" controls}
```

With `videoBaseUrl: "https://media.example.com/assets/"`, both `clip.mp4` and `/clip.mp4` resolve to
`https://media.example.com/assets/clip.mp4`. URLs with a protocol (including `blob:` and `data:`)
and protocol-relative URLs (`//...`) remain unchanged. The transformation only affects a `video`
node's string `src`; nested `source` elements are unchanged. Omit the option to preserve video
sources and leave the built-in plugin unloaded.

`MarkdownRenderer` also accepts `plugins?: ComarkPlugin[]` through its `plugins` prop. Pass
initialized Comark plugins; they run before the built-in video-source plugin. The renderer does not
mutate the supplied array. Built-in plugin selection and the video base URL are captured when the
renderer is created; remount it after changing the video configuration.

## Custom renderer components

Place Vue files directly in `app/components/<componentsDir>/`. Nested files are not discovered. Nuxt
owns filename resolution and extension support; a consumer file with the same registered name
replaces a built-in component.

This `MarkdownHero.vue` example uses the typed `defineEditorComponentSchema` compiler macro:

```vue
<script setup lang="ts">
import { defineEditorComponentSchema } from "#imports";

defineEditorComponentSchema({
  label: "Hero",
  description: "A prominent page introduction.",
  type: "block",
  properties: {
    actionTo: { input: "url" },
    image: { properties: { src: { input: "image" } } },
    actions: {
      items: {
        properties: {
          to: { input: "url" },
          icon: { input: { type: "icon", collections: ["lucide"] } }
        }
      }
    },
    legacyTone: { deprecated: { text: "Use tone instead." } }
  }
});

defineProps<{
  /** Main hero heading. */
  title: string;
  /** Horizontal content alignment. */
  align?: "left" | "center";
  /** Call-to-action destination. */
  actionTo?: string;
  image?: { src: string; alt?: string };
  actions?: { label: string; to: string; icon?: string }[];
  /** Legacy color name. */
  legacyTone?: string;
}>();
</script>

<template>
  <section>
    <h1>{{ title }}</h1>
    <slot />
  </section>
</template>
```

Use the registered component name in Markdown and component sets:

```md
::MarkdownHero{title="Build with Markdown" align="center" action-to="https://example.com"} Editable
**Markdown** in the default slot. ::
```

`nuxt-component-meta` infers prop types, nested object fields, array items, descriptions,
required/default state, literal unions, and JSDoc tags. The macro enriches these inferred fields
without repeating their TypeScript types:

For the module's built-in components, metadata inference reads the packaged typed Vue source. This
preserves JSDoc, defaults, slots, nested prop structure, and macro tags in installed applications as
well as the module playground.

| Field                                            | Purpose                                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `label`                                          | Human-facing label, distinct from the Markdown node name.                                                              |
| `description`                                    | Help text shown while choosing a component.                                                                            |
| `type`                                           | Required insertion behavior: `"block"` or `"inline"`.                                                                  |
| `deprecated`                                     | `true`, a non-empty guidance string, or `{ text: string }`.                                                            |
| `properties.<name>.values`                       | Explicit choices, particularly for imported union types.                                                               |
| `properties.<name>.input`                        | `"image"`/`{ type: "image" }`, `"url"`/`{ type: "url" }`, or `{ type: "icon", collections: [...] }` for a string prop. |
| `properties.<name>.properties`                   | Overrides for fields of an inferred object prop.                                                                       |
| `properties.<name>.items`                        | Overrides for the inferred item of an array prop.                                                                      |
| `properties.<name>.deprecated`                   | `true`, a non-empty guidance string, or `{ text: string }`.                                                            |
| `properties.<name>.type`                         | Explicit `string`, `number`, `boolean`, `object`, or `array` editor type.                                              |
| `properties.<name>.description/default/required` | Overrides the corresponding inferred metadata.                                                                         |

The macro translates `input` and `deprecated` to the standard tags consumed by the Directus
extension. Special inputs use a `specialInputType` tag; icon collections appear as
`config.collections` on that tag. The string and object forms are equivalent when an input requires
no options. Only fields declared by the input's Zod config schema are accepted and carried to the
tag's `config` object. The lower-level `extendComponentMeta` macro remains available for metadata
not covered by this convenience API. Invalid macro fields, including misspelled nested fields or
unsupported input controls, produce a build warning with the failing property path; that component's
editor overrides are ignored until the schema is corrected. The `image`, `url`, and `icon` inputs
require an inferred string prop, including at nested paths. An incompatible inferred type causes the
metadata endpoint to report the component and property path as a validation error.

Use `properties` at the top level of `defineEditorComponentSchema` and for nested object fields. The
generated metadata and Directus endpoint response continue to expose component fields as `props`.

### Component sets

Component-set values use the public Markdown node names. Passing `component-set="article"` to
`MarkdownRenderer` prevents components outside that set from resolving. The corresponding metadata
URL returns only that set. An unknown set prevents custom component resolution and its metadata URL
returns HTTP 404.

The reserved `Reference` node always resolves regardless of the selected set, including empty or
unknown sets. It remains excluded from all metadata endpoints and does not need a set entry.

Omit `component-set` to allow every discovered renderer component.

## Directus metadata endpoint

Configure the Directus Markdown editor with a browser-accessible URL:

```text
https://website.example.com/api/markdown-renderer/components/article
```

The endpoint returns a bare component array. Omit the final set name to return all discovered
components. `Reference` is deliberately omitted because the Directus editor owns that reserved node.
Both `GET` and browser `OPTIONS` preflight requests are handled.

The endpoint is public and sends no authentication challenge. CORS controls which browser origins
may read it; it is not an authorization mechanism. The default `corsOrigin: "*"` supports separate
local and production Directus installations. Configure explicit HTTPS origins when deployment policy
requires a narrower allowlist.

## References

The built-in `MarkdownReference` renders the persisted Directus syntax `:Reference`. It displays
`text ?? label` and remains plain text unless the application supplies a route resolver:

```ts
// app/utils/resolveReferencePath.ts
import type { ResolveReferencePath } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const resolveReferencePath: ResolveReferencePath = (collection, item, _label, _text, data) => {
  if (collection === "articles") return `/articles/${String(data?.slug ?? item)}`;
};

export default resolveReferencePath;
```

The resolver receives `collection`, `item`, optional `label`, optional author-controlled `text`, and
the optional Directus source snapshot `data`. Returning a string renders a Nuxt link; returning
`undefined` keeps the display text unlinked. The module never guesses application routes.

An application can replace the built-in behavior with
`app/components/<componentsDir>/MarkdownReference.vue`. It is still exposed to Markdown as
`Reference`, preserving existing stored content.

## Disable the module

```ts
export default defineNuxtConfig({
  markdownRenderer: { enabled: false }
});
```

The static type declaration remains available during `nuxt prepare`, but runtime components,
auto-imports, templates, and routes are not registered.

## Troubleshooting

| Symptom                              | Check                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------- |
| Custom component renders as Markdown | Put it directly in `app/components/<componentsDir>/` and use its Nuxt name. |
| Component is missing for one field   | Include its public name in the selected `componentSets` entry.              |
| Metadata URL returns 404             | The requested component-set name is not configured.                         |
| Directus reports a CORS failure      | Add the exact Directus origin to `corsOrigin`, including scheme and port.   |
| Metadata omits a custom component    | Ensure the SFC is discoverable and exposes parseable component metadata.    |
| Reference is not linked              | Configure `resolveReferencePath` and return a route for that collection.    |

## Development

```sh
pnpm --filter markdown-renderer-playground dev
pnpm --filter markdown-renderer-playground typecheck
pnpm --filter markdown-renderer-playground build
```

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

Component metadata endpoints resolve server metadata in both development and production.
