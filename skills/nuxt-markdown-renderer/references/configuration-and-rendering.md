# Configuration and rendering

## Module options

Configure the module under `markdownRenderer` in `nuxt.config.ts`.

| Option                  | Type                                          | Default      | Application contract                                                                         |
| ----------------------- | --------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `enabled`               | `boolean`                                     | `true`       | Register runtime components, auto-imports, templates, and routes.                            |
| `scopeComponentMeta`    | `boolean`                                     | `true`       | Scope global metadata extraction to built-ins and direct children of the renderer directory. |
| `componentsDir`         | `string`                                      | `"renderer"` | Directory relative to `app/components/`.                                                     |
| `componentSets`         | `Record<string, string[]>`                    | `{}`         | Named allowlists of registered Markdown node names.                                          |
| `referenceConfig`       | `{ linkResolver?: string }`                   | unset        | Optional reference callback file paths.                                                      |
| `relatedItemListConfig` | `{ mapItem?: string; linkResolver?: string }` | unset        | Optional related-list callback file paths.                                                   |
| `videoBaseUrl`          | `string`                                      | unset        | Absolute URL used to prefix relative video sources.                                          |
| `corsOrigin`            | `string \| string[]`                          | `"*"`        | Browser origins allowed to read metadata.                                                    |

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"],
  markdownRenderer: {
    enabled: true,
    componentsDir: "renderer",
    scopeComponentMeta: true,
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
    corsOrigin: ["https://directus.example.com", "http://localhost:8055"]
  }
});
```

Use exact origins, including scheme and port. A single origin string is normalized to an allowlist.
Use `"null"` only for an intentionally opaque browser origin. The default `"*"` allows all origins.
Option validation rejects unknown fields, empty directory/resolver strings, empty origin arrays, and
non-absolute video base URLs.

Scoping applies to the application's global `nuxt-component-meta` parser. If unrelated components
need metadata, set `scopeComponentMeta: false`; this preserves its normal component/directory
configuration while retaining built-in enrichment. Global extraction can cost more build time and
memory.

## MarkdownRenderer

The global component wraps Comark rendering with lazy renderer-component resolution.

| Prop           | Type             | Default     | Purpose                                           |
| -------------- | ---------------- | ----------- | ------------------------------------------------- |
| `value`        | `string`         | `undefined` | Markdown or MDC source.                           |
| `componentSet` | `string`         | `undefined` | Restrict renderer components to a configured set. |
| `plugins`      | `ComarkPlugin[]` | `undefined` | Initialized caller plugins.                       |

```vue
<script setup lang="ts">
const content = `# Article

::MarkdownCallout{title="Before you continue" color="warning"}
Read the documentation before proceeding.
::

:MarkdownButton{label="Documentation" to="/docs" variant="soft"}
`;
</script>

<template>
  <MarkdownRenderer :value="content" component-set="article" />
</template>
```

Omit `component-set` to allow every discovered renderer component. An unknown set prevents custom
component resolution and returns HTTP 404 from its metadata URL. Sets use registered node names;
`Reference` and `RelatedItemList` always resolve regardless of the selected set, including empty or
unknown sets, and remain excluded from all metadata endpoints. Neither needs a set entry.

## MDC syntax

Use `:Name{...}` for an inline node and matching `::` fences on separate lines for block content.
For complex props, use YAML frontmatter inside the component block. Named slots use `#slotName`.

```md
::MarkdownCallout
---

title: Need help? icon: i-lucide-info color: info actions:

- label: Contact us to: /contact variant: outline

---

#description Read the **guide** or contact our team. ::
```

`MarkdownCallout` exposes the `description` slot; put its editable Markdown there. For a custom
component that renders `<slot />`, put Markdown in its default slot instead:

```md
::MarkdownHero{title="Welcome" align="center"} A **custom** introduction. ::
```

Component syntax and editor insertion metadata are separate: the built-in button's editor metadata
uses `type: "block"`, while existing inline `:MarkdownButton{...}` content is also supported.

## Built-in component APIs

### RelatedItemList (MarkdownRelatedItemList)

CMS-owned block node with only `items: RelatedItem[]` and no slots or additional display props. It
reuses the built-in `MarkdownItemList` without dividers and preserves selection order. Its Vue
implementation is `MarkdownRelatedItemList`; the persisted node remains `RelatedItemList`, following
the `MarkdownReference` → `Reference` pattern. Each selection contains `collection: string`,
`item: string | number`, optional `label: string`, and optional `data: Record<string, unknown>`. The
CMS supplies snapshots; the component does not fetch data.

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

Set `markdownRenderer.relatedItemListConfig.mapItem` and `.linkResolver` to Nuxt-resolvable file
paths. Each file default-exports its callback:

```ts
// app/utils/mapRelatedItem.ts
import type { MapRelatedItem } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const mapRelatedItem: MapRelatedItem = (item) => {
  const { summary, image } = item.data ?? {};
  return {
    description: typeof summary === "string" ? summary : undefined,
    image: typeof image === "string" ? `/assets/${encodeURIComponent(image)}` : undefined
  };
};

export default mapRelatedItem;
```

```ts
// app/utils/resolveRelatedItemPath.ts
import type { ResolveRelatedItemPath } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const resolveRelatedItemPath: ResolveRelatedItemPath = (item) => {
  const slug = item.data?.slug;
  if (item.collection !== "articles" || typeof slug !== "string") return undefined;
  return `/articles/${encodeURIComponent(slug)}`;
};

export default resolveRelatedItemPath;
```

Both callback paths are optional. The synchronous callbacks use the exported `MapRelatedItem` and
`ResolveRelatedItemPath` types: `mapItem` returns `Omit<ItemListItem, "to">`, while `linkResolver`
returns `string | undefined`. Both receive the full `RelatedItem`, including numeric primary keys.
These types are exported from `/runtime`. Titles default to source labels and can be overridden;
other display fields and links remain unset without configuration. Consumers own collection-specific
validation, image URL conversion, and routing. The configuration runs during SSR and in the client;
keep it free of secrets.

`RelatedItem` is a plain TypeScript interface. Like `Reference`, selections are mapped without
runtime prop validation; consumers validate persisted data at their CMS/content ingestion boundary.
Additional component attributes, including `divide`, are ignored. Like `Reference`, this node
resolves even with an empty or unknown component set and is excluded from generic editor metadata.

### MarkdownItemList

A block wrapper around Nuxt UI `UPageList` with ghost `UPageCard` rows and no content slots. The
`items` array is required. The optional `divide` boolean defaults to `false`.

The CMS displays `title`, `description`, `to`, `external`, `image`, and `icon` in that order. All
six fields are optional. `external` is a boolean and the other fields are strings. `image` accepts a
URL and `icon` accepts an Iconify name. Images take precedence over icons. An item with
`external: true` and a non-empty `to` opens as an external link in a new tab. Without `to`, the item
remains unlinked.

```mdc
::MarkdownItemList
---
divide: true
items:
  - title: Services
    image: /images/services.jpg
    to: /services
  - title: Nuxt UI
    description: Component documentation
    icon: i-lucide-external-link
    to: https://ui.nuxt.com
    external: true
---
::
```

Add `MarkdownItemList` to the selected component set when using one. Nested editor metadata uses the
image and URL controls and the Lucide icon picker. The current metadata contract has no conditional
field visibility: `icon` and `external` remain editable regardless of `image` and `to`. Runtime
image precedence and link handling still apply.

When upgrading from v0.3.0, rename stored `::ItemList` blocks to `::MarkdownItemList` and update any
`ItemList` entries in `componentSets` and editor integrations to `MarkdownItemList`.

### MarkdownAnchor

An invisible block anchor with one required string prop, `id`, and no slots:

```mdc
::MarkdownAnchor{id="existing-fragment"}
::
```

Renders `<span id="existing-fragment" class="markdown-anchor"></span>`. Link to it with
`[Jump to section](#existing-fragment)`. Add `MarkdownAnchor` to the selected component set when
using one.

The module stylesheet sets `display: block` and `scroll-margin-top: 100px`, producing a −100px
scroll offset without visible content or layout space. Consumers can override
`.markdown-anchor { scroll-margin-top: 64px; }` in CSS loaded after the module stylesheet.

### MarkdownButton

Renders a Nuxt UI `UButton` with these declared props. `label` and `to` are required.

| Prop       | Type / choices                                                           | Default   |
| ---------- | ------------------------------------------------------------------------ | --------- |
| `label`    | `string`                                                                 | required  |
| `to`       | `string` (route or full URL)                                             | required  |
| `color`    | `primary`, `secondary`, `success`, `info`, `warning`, `error`, `neutral` | `primary` |
| `variant`  | `solid`, `outline`, `soft`, `subtle`, `ghost`, `link`                    | `soft`    |
| `size`     | `xs`, `sm`, `md`, `lg`, `xl`                                             | `md`      |
| `icon`     | `string` (Iconify name)                                                  | unset     |
| `trailing` | `boolean`                                                                | unset     |
| `download` | `boolean`                                                                | unset     |

```md
:MarkdownButton{label="Download guide" to="/guide.pdf" icon="i-lucide-download" download}
```

### MarkdownCallout

Renders a Nuxt UI `UAlert`, including its named `description` slot.

| Prop          | Type / choices                       | Default    |
| ------------- | ------------------------------------ | ---------- |
| `title`       | `string`                             | unset      |
| `color`       | Same colors as `MarkdownButton`      | `primary`  |
| `variant`     | `solid`, `outline`, `soft`, `subtle` | `soft`     |
| `icon`        | `string`                             | unset      |
| `orientation` | `horizontal`, `vertical`             | `vertical` |
| `actions`     | Array of action objects              | unset      |

Each action has required `label: string` and `to: string`, and optional `color`, `variant`, `size`,
`icon`, `trailing`, and `download` with the button types above. No action defaults are declared by
this module. Built-in icon editor controls use the `lucide` collection. To change the collections,
override the relevant component and supply its own editor schema.

### Reference

The `Reference` node maps to `MarkdownReference`. Its props and resolver are documented in
[Reference links](references-and-troubleshooting.md#reference-node-and-props).

## Plugins and video sources

Pass initialized Comark plugins, rather than factories, to `plugins`. A typed application wrapper
can accept plugins already initialized by the caller:

```vue
<script setup lang="ts">
import type { ComarkPlugin } from "comark";

defineProps<{ content: string; plugins: ComarkPlugin[] }>();
</script>

<template>
  <MarkdownRenderer :value="content" :plugins="plugins" />
</template>
```

Caller plugins run before the optional built-in video-source plugin. The supplied array is not
mutated. The module does not export its video plugin as a consumer API; configure `videoBaseUrl`.

```md
:video{src="clip.mp4" controls}
```

With `videoBaseUrl: "https://media.example.com/assets/"`:

| Source                               | Result                                      |
| ------------------------------------ | ------------------------------------------- |
| `clip.mp4`                           | `https://media.example.com/assets/clip.mp4` |
| `/clip.mp4`                          | `https://media.example.com/assets/clip.mp4` |
| `https://other.example.com/clip.mp4` | unchanged                                   |
| `//other.example.com/clip.mp4`       | unchanged                                   |
| `blob:...` or `data:...`             | unchanged                                   |

Only string `src` attributes on `video` nodes are rewritten; nested `source` elements are unchanged.
Omitting `videoBaseUrl` preserves sources and leaves the built-in plugin unloaded. Built-in plugin
selection and base URL are captured when the renderer is created; remount after changing video
configuration.
