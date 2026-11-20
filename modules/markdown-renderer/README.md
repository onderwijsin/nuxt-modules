# @onderwijsin/nuxt-markdown-renderer

Nuxt 4 module for rendering Markdown and MDC with Comark, Nuxt UI Prose, lazy application
components, and component metadata for the Directus Markdown editor.

## Features

- Renders Markdown and MDC through the global `MarkdownRenderer` component.
- Includes `MarkdownItemList`, `MarkdownRelatedItemList`, `MarkdownAnchor`, `MarkdownButton`,
  `MarkdownCallout`, and the persisted `Reference` node.
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

| Markdown node      | Vue implementation        | Editor label | Behavior                                     |
| ------------------ | ------------------------- | ------------ | -------------------------------------------- |
| `MarkdownAnchor`   | `MarkdownAnchor`          | Anchor       | Invisible block target for fragment links.   |
| `MarkdownButton`   | `MarkdownButton`          | Button       | Inline Nuxt UI button or link.               |
| `MarkdownCallout`  | `MarkdownCallout`         | Callout      | Block Nuxt UI alert with editable content.   |
| `MarkdownItemList` | `MarkdownItemList`        | Item list    | Stacked page cards with optional dividers.   |
| `Reference`        | `MarkdownReference`       | —            | Directus item reference; excluded from menu. |
| `RelatedItemList`  | `MarkdownRelatedItemList` | —            | CMS selections rendered as mapped item rows. |

The built-in button's icon editor metadata uses the `lucide` collection by default. To offer other
icon collections in component metadata, override the relevant renderer component and define its own
`defineEditorComponentSchema` with the desired `collections` for each icon input.

For example:

```md
::MarkdownCallout{title="Before you continue" color="warning"} Read the
:MarkdownButton{label="documentation" to="/docs" variant="soft"}. ::
```

### Fragment anchors

Insert an invisible block anchor with a required string `id` and no slots:

```mdc
::MarkdownAnchor{id="existing-fragment"}
::
```

This renders `<span id="existing-fragment" class="markdown-anchor"></span>`. Link to it with
`[Jump to section](#existing-fragment)`. Include `MarkdownAnchor` in any component set used to
render it.

The module stylesheet uses `display: block` and `scroll-margin-top: 100px` to give the empty span a
−100px scroll offset without adding visible content or layout space. Override the offset in your own
CSS after the module stylesheet:

```css
.markdown-anchor {
  scroll-margin-top: 64px;
}
```

### Item lists

The `MarkdownItemList` component wraps Nuxt UI's `UPageList` and ghost `UPageCard` components. It
accepts a required `items` array and an optional boolean `divide` prop (default `false`). It exposes
no content slots. All item fields are optional:

| Field         | Type      | Behavior                                                           |
| ------------- | --------- | ------------------------------------------------------------------ |
| `image`       | `string`  | Image URL, displayed instead of the icon when supplied.            |
| `title`       | `string`  | Item heading.                                                      |
| `description` | `string`  | Supporting text.                                                   |
| `to`          | `string`  | Internal path or full URL. Omit to render an unlinked item.        |
| `external`    | `boolean` | Opens `to` as an external link in a new tab. Ignored without `to`. |
| `icon`        | `string`  | Iconify icon name, used when no image is supplied.                 |

```mdc
::MarkdownItemList
---
divide: true
items:
  - title: Our services
    description: Explore how we can help.
    image: /images/services.jpg
    to: /services
  - title: Nuxt UI
    icon: i-lucide-external-link
    to: https://ui.nuxt.com
    external: true
---
::
```

Include `MarkdownItemList` in any component set used to render it. Editor metadata provides image,
URL, and Lucide icon controls for the nested fields. Conditional field visibility is not supported
by the current metadata contract: `icon` and `external` remain visible in the editor; rendering
gives images precedence and ignores `external` when `to` is empty.

When upgrading from v0.3.0, rename stored `::ItemList` blocks to `::MarkdownItemList` and update any
`ItemList` entries in `componentSets` and editor integrations to `MarkdownItemList`.

### Related item lists

The `RelatedItemList` node is rendered by `MarkdownRelatedItemList`, reusing `MarkdownItemList` to
render CMS-selected content in its original order. Its only prop is the required `items` array; it
has no slots or additional display props. Like `MarkdownReference` → `Reference`,
`MarkdownRelatedItemList` keeps its CMS-owned node name `RelatedItemList`. Each selection has a
required `collection: string` and `item: string | number`, plus optional `label: string` and
`data: Record<string, unknown>`.

```mdc
::RelatedItemList
---
items:
  - collection: articles
    item: article-7
    label: Becoming a teacher
    data:
      slug: becoming-a-teacher
      summary: Explore the routes into teaching.
      image: image-uuid
  - collection: programs
    item: 42
    label: Teaching traineeship
    data:
      slug: teaching-traineeship
      duration: 24
---
::
```

Set `markdownRenderer.relatedItemListConfig.mapItem` and `.linkResolver` to Nuxt-resolvable callback
file paths. Without configuration, rows display their source labels and remain unlinked; the
renderer does not guess snapshot fields, image URLs, or application routes.

```ts
// app/utils/mapRelatedItem.ts
import type { MapRelatedItem } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const mapRelatedItem: MapRelatedItem = (item) => {
  const { summary, duration, image } = item.data ?? {};
  return {
    description:
      typeof summary === "string"
        ? summary
        : typeof duration === "number"
          ? `${duration} months`
          : undefined,
    image:
      typeof image === "string"
        ? `https://cms.example.com/assets/${encodeURIComponent(image)}`
        : undefined
  };
};

export default mapRelatedItem;
```

```ts
// app/utils/resolveRelatedItemPath.ts
import type { ResolveRelatedItemPath } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const resolveRelatedItemPath: ResolveRelatedItemPath = (item) => {
  const slug = item.data?.slug;
  if (typeof slug !== "string") return undefined;
  if (item.collection === "articles") return `/articles/${encodeURIComponent(slug)}`;
  if (item.collection === "programs") return `/programs/${encodeURIComponent(slug)}`;
  return undefined;
};

export default resolveRelatedItemPath;
```

Both callbacks are optional, synchronous, and receive the full selection. `mapItem` returns any
`ItemListItem` fields except `to`; the source label remains the title unless overridden.
`linkResolver` returns the `to` string, or `undefined` to keep a row unlinked. The `/runtime`
entrypoint exports `RelatedItem`, `ItemListItem`, `MapRelatedItem`, and `ResolveRelatedItemPath`
types. Callback code is bundled for SSR and client rendering; do not put secrets in it.

Like `Reference`, this node resolves independently of component sets and is excluded from generic
editor metadata because the CMS owns its selection UI. It accepts no additional attributes,
including `divide`, and uses the default undivided layout. Like `Reference`, related items use a
TypeScript contract without runtime prop validation. Consumers own validation at their CMS/content
ingestion boundary and conversion of collection-specific snapshot fields. Snapshots are rendered as
provided, without fetching data.

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
    referenceConfig: { linkResolver: "~/utils/resolveReferencePath" },
    relatedItemListConfig: {
      mapItem: "~/utils/mapRelatedItem",
      linkResolver: "~/utils/resolveRelatedItemPath"
    },
    videoBaseUrl: "https://media.example.com/assets/",
    corsOrigin: "https://directus.example.com"
  }
});
```

| Option                  | Type                                          | Default      | Description                                                       |
| ----------------------- | --------------------------------------------- | ------------ | ----------------------------------------------------------------- |
| `enabled`               | `boolean`                                     | `true`       | Enables component, manifest, and metadata endpoint registration.  |
| `scopeComponentMeta`    | `boolean`                                     | `true`       | Limits global component metadata extraction to renderer sources.  |
| `componentsDir`         | `string`                                      | `"renderer"` | Directory below `app/components/` containing renderer components. |
| `componentSets`         | `Record<string, string[]>`                    | `{}`         | Named allowlists used by rendering and metadata endpoints.        |
| `referenceConfig`       | `{ linkResolver?: string }`                   | unset        | Reference callback file paths.                                    |
| `relatedItemListConfig` | `{ mapItem?: string; linkResolver?: string }` | unset        | Related-list callback file paths.                                 |
| `videoBaseUrl`          | `string`                                      | unset        | Absolute base URL for relative video sources.                     |
| `corsOrigin`            | `string \| string[]`                          | `"*"`        | Origins allowed to call the metadata endpoint from a browser.     |

Both configuration objects and their callback paths are optional. Each path resolves through Nuxt
aliases and extensions and points to a default-exported function. A missing reference link resolver
keeps references as plain text; a missing related-item mapper keeps source labels; a missing
related-item link resolver keeps rows unlinked. Callback code runs during SSR and in the browser.

**Breaking migration:** replace `resolveReferencePath: "~/utils/resolveReferencePath"` with
`referenceConfig: { linkResolver: "~/utils/resolveReferencePath" }`. The resolver file, its function
signature, and stored `Reference` nodes remain unchanged. The old option is rejected rather than
silently ignored. This breaking configuration change is intentionally released as a minor.

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

| Field                                            | Purpose                                                                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`                                          | Human-facing label, distinct from the Markdown node name.                                                                                    |
| `description`                                    | Help text shown while choosing a component.                                                                                                  |
| `type`                                           | Required insertion behavior: `"block"` or `"inline"`.                                                                                        |
| `deprecated`                                     | `true`, a non-empty guidance string, or `{ text: string }`.                                                                                  |
| `properties.<name>.values`                       | Explicit choices, particularly for imported union types.                                                                                     |
| `properties.<name>.input`                        | `"image"`, `"video"`, or `"url"` as shorthand or in an object such as `{ type: "video" }`. Icon uses `{ type: "icon", collections: [...] }`. |
| `properties.<name>.properties`                   | Overrides for fields of an inferred object prop.                                                                                             |
| `properties.<name>.items`                        | Overrides for the inferred item of an array prop.                                                                                            |
| `properties.<name>.deprecated`                   | `true`, a non-empty guidance string, or `{ text: string }`.                                                                                  |
| `properties.<name>.type`                         | Explicit `string`, `number`, `boolean`, `object`, or `array` editor type.                                                                    |
| `properties.<name>.description/default/required` | Overrides the corresponding inferred metadata.                                                                                               |

The macro translates `input` and `deprecated` to the standard tags consumed by the Directus
extension. Special inputs use a `specialInputType` tag; icon collections appear as
`config.collections` on that tag. The string and object forms are equivalent when an input requires
no options. Only fields declared by the input's Zod config schema are accepted and carried to the
tag's `config` object. The lower-level `extendComponentMeta` macro remains available for metadata
not covered by this convenience API. Invalid macro fields, including misspelled nested fields or
unsupported input controls, produce a build warning with the failing property path; that component's
editor overrides are ignored until the schema is corrected. The `image`, `video`, `url`, and `icon`
inputs require an inferred string prop, including at nested paths. An incompatible inferred type
causes the metadata endpoint to report the component and property path as a validation error.

Use `properties` at the top level of `defineEditorComponentSchema` and for nested object fields. The
generated metadata and Directus endpoint response continue to expose component fields as `props`.

### Component sets

Component-set values use the public Markdown node names. Passing `component-set="article"` to
`MarkdownRenderer` prevents components outside that set from resolving. The corresponding metadata
URL returns only that set. An unknown set prevents custom component resolution and its metadata URL
returns HTTP 404.

The CMS-owned `Reference` and `RelatedItemList` nodes always resolve regardless of the selected set,
including empty or unknown sets. They remain excluded from all metadata endpoints and need no set
entry.

Omit `component-set` to allow every discovered renderer component.

## Directus metadata endpoint

Configure the Directus Markdown editor with a browser-accessible URL:

```text
https://website.example.com/api/markdown-renderer/components/article
```

The endpoint returns a bare component array. Omit the final set name to return all discovered
components. `Reference` and `RelatedItemList` are omitted because the CMS owns those editor nodes.
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

| Symptom                              | Check                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| Custom component renders as Markdown | Put it directly in `app/components/<componentsDir>/` and use its Nuxt name.      |
| Component is missing for one field   | Include its public name in the selected `componentSets` entry.                   |
| Metadata URL returns 404             | The requested component-set name is not configured.                              |
| Directus reports a CORS failure      | Add the exact Directus origin to `corsOrigin`, including scheme and port.        |
| Metadata omits a custom component    | Ensure the SFC is discoverable and exposes parseable component metadata.         |
| Reference is not linked              | Configure `referenceConfig.linkResolver` and return a route for that collection. |

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
