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
- Nuxt UI 4 and Comark are installed automatically as Nuxt module dependencies.

## Installation

```sh
pnpm add @onderwijsin/nuxt-markdown-renderer
```

Register the module:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"]
});
```

## Render Markdown

`MarkdownRenderer` accepts the Markdown source and an optional named component set:

```vue
<template>
  <MarkdownRenderer :value="article.content" component-set="article" />
</template>
```

| Prop           | Type     | Default     | Description                                     |
| -------------- | -------- | ----------- | ----------------------------------------------- |
| `value`        | `string` | `undefined` | Markdown or MDC source.                         |
| `componentSet` | `string` | `undefined` | Optional configured custom-component allowlist. |

The built-in MDC nodes are:

| Markdown node     | Vue implementation  | Editor label | Behavior                                     |
| ----------------- | ------------------- | ------------ | -------------------------------------------- |
| `MarkdownButton`  | `MarkdownButton`    | Button       | Inline Nuxt UI button or link.               |
| `MarkdownCallout` | `MarkdownCallout`   | Callout      | Block Nuxt UI alert with editable content.   |
| `Reference`       | `MarkdownReference` | —            | Directus item reference; excluded from menu. |

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
    componentsDir: "renderer",
    componentSets: {
      article: ["MarkdownButton", "MarkdownCallout", "MarkdownHero"],
      landing: ["MarkdownButton", "MarkdownHero"]
    },
    resolveReferencePath: "~/utils/resolveReferencePath",
    corsOrigin: "https://directus.example.com"
  }
});
```

| Option                 | Type                       | Default      | Description                                                       |
| ---------------------- | -------------------------- | ------------ | ----------------------------------------------------------------- |
| `enabled`              | `boolean`                  | `true`       | Enables component, manifest, and metadata endpoint registration.  |
| `componentsDir`        | `string`                   | `"renderer"` | Directory below `app/components/` containing renderer components. |
| `componentSets`        | `Record<string, string[]>` | `{}`         | Named allowlists used by rendering and metadata endpoints.        |
| `resolveReferencePath` | `string`                   | unset        | Nuxt-resolvable path to a default-exported Reference resolver.    |
| `corsOrigin`           | `string \| string[]`       | `"*"`        | Origins allowed to call the metadata endpoint from a browser.     |

A single `corsOrigin` string is accepted and normalized to an allowlist. Use `"null"` only when a
sandboxed or local client intentionally sends an opaque origin.

## Custom renderer components

Place Vue files directly in `app/components/<componentsDir>/`. Nested files are not discovered. Nuxt
owns filename resolution and extension support; a consumer file with the same registered name
replaces a built-in component.

This `MarkdownHero.vue` example uses the typed `extendMarkdownComponent` compiler macro:

```vue
<script setup lang="ts">
import { extendMarkdownComponent } from "#imports";

extendMarkdownComponent({
  label: "Hero",
  description: "A prominent page introduction.",
  type: "block",
  props: {
    align: { values: ["left", "center"] },
    actionTo: { input: "url" },
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

`nuxt-component-meta` infers prop types, descriptions, required/default state, literal unions, and
JSDoc tags. The macro covers editor information that cannot be inferred reliably:

| Field                                       | Purpose                                                         |
| ------------------------------------------- | --------------------------------------------------------------- |
| `label`                                     | Human-facing label, distinct from the Markdown node name.       |
| `description`                               | Help text shown while choosing a component.                     |
| `type`                                      | Required insertion behavior: `"block"` or `"inline"`.           |
| `deprecated`                                | `true` or migration guidance for the component.                 |
| `props.<name>.values`                       | Explicit choices, particularly for imported union types.        |
| `props.<name>.input`                        | `"image"` or `"url"` control for an underlying string prop.     |
| `props.<name>.deprecated`                   | `true` or migration guidance for one prop.                      |
| `props.<name>.type`                         | Explicit `string`, `number`, `boolean`, or `array` editor type. |
| `props.<name>.description/default/required` | Overrides the corresponding inferred metadata.                  |

The macro translates `input` and `deprecated` to the standard tags consumed by the Directus
extension. The lower-level `extendComponentMeta` macro remains available for metadata not covered by
this convenience API.

### Component sets

Component-set values use the public Markdown node names. Passing `component-set="article"` to
`MarkdownRenderer` prevents components outside that set from resolving. The corresponding metadata
URL returns only that set. An unknown set prevents custom component resolution and its metadata URL
returns HTTP 404.

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
