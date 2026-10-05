# Configuration and rendering

## Module options

Configure the module under `markdownRenderer` in `nuxt.config.ts`.

| Option                 | Type                       | Default      | Application contract                                                                         |
| ---------------------- | -------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `enabled`              | `boolean`                  | `true`       | Register runtime components, auto-imports, templates, and routes.                            |
| `scopeComponentMeta`   | `boolean`                  | `true`       | Scope global metadata extraction to built-ins and direct children of the renderer directory. |
| `componentsDir`        | `string`                   | `"renderer"` | Directory relative to `app/components/`.                                                     |
| `componentSets`        | `Record<string, string[]>` | `{}`         | Named allowlists of registered Markdown node names.                                          |
| `resolveReferencePath` | `string`                   | unset        | Nuxt-resolvable path to a default-exported resolver.                                         |
| `videoBaseUrl`         | `string`                   | unset        | Absolute URL used to prefix relative video sources.                                          |
| `corsOrigin`           | `string \| string[]`       | `"*"`        | Browser origins allowed to read metadata.                                                    |

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"],
  markdownRenderer: {
    enabled: true,
    componentsDir: "renderer",
    scopeComponentMeta: true,
    componentSets: {
      article: ["MarkdownButton", "MarkdownCallout", "MarkdownHero", "Reference"],
      landing: ["MarkdownButton", "MarkdownHero"]
    },
    resolveReferencePath: "~/utils/resolveReferencePath",
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
include `Reference` when reference links should resolve in that set. `Reference` is still omitted
from the editor metadata menu.

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
