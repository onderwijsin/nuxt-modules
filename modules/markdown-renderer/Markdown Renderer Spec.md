# `@onderwijsin/nuxt-markdown-renderer`

Initial feature specification for a Nuxt 4 module that renders Markdown produced by
`@onderwijsin/directus-markdown-editor-bundle`.

## Purpose

`@onderwijsin/nuxt-markdown-renderer` is the frontend companion to the Directus Markdown editor
bundle
(https://github.com/onderwijsin/directus-extensions/blob/main/extensions/directus-markdown-editor-bundle/README.md).

Its responsibilities are:

- render Markdown/MDC using Comark;
- map standard Markdown nodes to Nuxt UI / Nuxt UI Prose where appropriate or necessary;
- provide a small set of built-in renderer components;
- allow consuming applications to add or override renderer components;
- lazy-load renderer components through Comark's `componentsManifest`;
- expose component metadata endpoints that the Directus editor can consume;
- support different sets of available components for different content contexts.

The module should stay relatively thin and build on Comark, Nuxt UI and `nuxt-component-meta` rather
than introducing its own Markdown abstraction.

---

## Package

```text
@onderwijsin/nuxt-markdown-renderer
```

Target:

- Nuxt 4
- Vue 3
- Nuxt UI
- Comark
- `nuxt-component-meta`

---

## Renderer component

The module provides an auto-imported renderer component:

```vue
<MarkdownRenderer :value="article.content" />
```

Optionally, a component set can be selected:

```vue
<MarkdownRenderer :value="article.content" component-set="article" />
```

The renderer passes the Markdown and generated Comark component manifest to Comark.

Standard Markdown nodes should render using Nuxt UI / Nuxt UI Prose components where available.

---

## Built-in renderer components

The module initially provides:

- `MarkdownReference` (ULink), mapped to the persisted `Reference` Markdown node
- `MarkdownButton` (UButton), labelled “Button” in the editor
- `MarkdownCallout` (UAlert), labelled “Callout” in the editor

These components should use Nuxt UI components where appropriate.

Additional built-ins can be added later without changing the general architecture.

---

## Consumer components

Consuming Nuxt applications can add renderer components through a reserved components directory.

Default:

```text
components/
└── renderer/
    ├── Hero.vue
    ├── Video.vue
    └── ProjectCard.vue
```

The directory name must be configurable.

Example:

```ts
export default defineNuxtConfig({
  markdownRenderer: {
    componentsDir: "renderer"
  }
});
```

Changing it to:

```ts
componentsDir: "markdown";
```

means the module should discover components under:

```text
components/markdown/
```

For the initial version, discovery can be limited to Vue components directly inside this directory.
Recursive/nested component naming does not need to be solved yet.

---

## Built-in component overrides

Consumer components override built-in components by name.

For example:

```text
components/renderer/MarkdownCallout.vue
components/renderer/MarkdownReference.vue
```

replace the module-provided `MarkdownCallout` and `MarkdownReference` implementations. The latter
continues to resolve persisted `:Reference` nodes.

Conceptually:

```ts
const componentsManifest = {
  ...builtInManifest,
  ...consumerManifest
};
```

The consumer always wins on name collisions.

---

## Comark component manifest

Custom renderer components must be supplied to Comark through its `componentsManifest` API
(https://comark.dev/rendering/nuxt#markdown-props-componentsmanifest).

This is the primary runtime component-loading mechanism.

The module should generate a manifest containing:

1. built-in renderer components;
2. discovered consumer renderer components.

The manifest should preserve lazy loading and code splitting as much as possible.

The module should not introduce an additional eager component registry or eagerly import all
renderer components.

Conceptually:

```vue
<Markdown :value="value" :components-manifest="componentsManifest" />
```

The exact Comark component/API names should follow the current Comark Nuxt integration.

---

## Component metadata

The same discovered component sources should also be used to generate metadata for the Directus
Markdown editor.

Metadata should be gathered with:

```text
nuxt-component-meta
```

The goal is to avoid separate frontend-renderer and editor-metadata registries that can drift apart.

Conceptually:

```text
built-ins + components/{componentsDir}/*.vue
                  │
                  ├── Comark componentsManifest
                  │      └── runtime rendering / lazy loading
                  │
                  └── nuxt-component-meta
                         └── Directus metadata endpoints
```

Metadata should include the information required by the Directus editor, such as:

- component name;
- props;
- prop types;
- required/default information where available;
- descriptions/JSDoc where available;
- slots where relevant.

The exact transformation should follow the metadata contract expected by
`directus-markdown-editor-bundle`.

Renderer components may add editor-only metadata with the auto-imported `extendMarkdownComponent`
compiler macro:

```ts
extendMarkdownComponent({
  label: "Callout",
  description: "Highlights important information.",
  type: "block",
  props: {
    color: { values: ["info", "warning"] },
    image: { input: "image" },
    legacyTone: { deprecated: { text: "Use color instead." } }
  }
});
```

The macro translates `input: "image" | "url"` and `deprecated: true | { text: string }` to the tags
understood by the Directus metadata contract. Types, descriptions, defaults, required state, literal
values, and JSDoc tags should still be inferred wherever possible.

---

## Component sets

Different Markdown fields may expose different components.

The module should support named component sets.

Example:

```ts
export default defineNuxtConfig({
  markdownRenderer: {
    componentSets: {
      article: ["MarkdownButton", "MarkdownCallout", "Video"],

      page: ["MarkdownButton", "MarkdownCallout", "Hero", "ProjectCard", "Video"]
    }
  }
});
```

A component can belong to multiple sets.

Component sets primarily control which components are advertised to the Directus editor for a given
context.

They may also be used by `MarkdownRenderer` to constrain the available Comark manifest for a render.

The implementation should avoid loading components that are not required for the selected set where
practical.

---

## Component metadata endpoints

The module exposes server endpoints that return component metadata for a configured component set.

For example:

```text
/api/markdown-renderer/components/article
/api/markdown-renderer/components/page
```

These endpoints should be directly consumable by `directus-markdown-editor-bundle`.

The exact base route can become configurable later if needed, but does not need to be
over-engineered in the first version.

`Reference` is a reserved editor node and should not be exposed as a normal insertable custom
component.

---

## `Reference`

`MarkdownReference` renders the `Reference` syntax produced by the Directus editor. This explicit
mapping preserves existing Directus content while keeping the Vue component name prefixed.

Example source:

```md
:Reference{collection="articles" item="article-7" label="Becoming a teacher" text="this article"
:data="{...}"}
```

The built-in component should display:

```ts
text ?? label;
```

### Reference path resolver

Applications can configure how references map to application routes.

The module option should accept an import path:

```ts
export default defineNuxtConfig({
  markdownRenderer: {
    resolveReferencePath: "~/utils/resolveReferencePath",

    corsOrigin: "https://directus.example.com"
  }
});
```

The imported module should default-export a resolver matching the following conceptual signature:

```ts
export type ResolveReferencePath = (
  collection: string,
  item: string,
  label?: string,
  text?: string,
  data?: Record<string, unknown>
) => string | undefined;
```

Example:

```ts
export default function resolveReferencePath(
  collection: string,
  item: string,
  label?: string,
  text?: string,
  data?: Record<string, unknown>
): string | undefined {
  if (collection === "articles") {
    return `/articles/${String(data?.slug ?? item)}`;
  }

  return undefined;
}
```

An import path is preferred over placing an arbitrary function directly in `nuxt.config.ts`, because
the resolver must be available inside the runtime Vue bundle.

### Default `Reference` behaviour

The built-in `MarkdownReference` behaves as follows:

1. If the consumer provides `components/{componentsDir}/MarkdownReference.vue`, that component fully
   replaces the built-in behaviour.
2. If no override exists and `resolveReferencePath` returns a path, render the reference using
   `ULink`.
3. If no resolver is configured, or the resolver returns `undefined`, render the display text as
   plain text rather than guessing a URL.

Conceptually:

```vue
<ULink v-if="path" :to="path">
  {{ text ?? label }}
</ULink>

<span v-else>
  {{ text ?? label }}
</span>
```

The module must not invent routing conventions such as `/${collection}/${item}`.

---

## Suggested module configuration

Initial public configuration should roughly support:

```ts
export default defineNuxtConfig({
  markdownRenderer: {
    componentsDir: "renderer",

    componentSets: {
      article: ["MarkdownButton", "MarkdownCallout", "Video"],

      page: ["MarkdownButton", "MarkdownCallout", "Hero", "ProjectCard", "Video"]
    },

    resolveReferencePath: "~/utils/resolveReferencePath"
  }
});
```

The exact TypeScript types and naming can be refined during implementation, but the behaviour
described here should remain the same.

The component metadata endpoint must support browser CORS and preflight requests. `corsOrigin`
defaults to `"*"` because the endpoint exposes public component descriptions rather than user data.
Consumers can configure one origin or an array of origins to restrict browser access.

---

## Bundle-size requirements

Bundle size is an explicit concern.

The implementation should:

- use Comark's `componentsManifest` for async component resolution;
- avoid eagerly importing all renderer components;
- preserve code splitting for consumer components;
- avoid putting every component into the main application bundle merely because it is registered;
- avoid duplicating functionality already provided by Comark;
- avoid shipping editor-only metadata logic in the client bundle where possible.

---

## Non-goals for the initial version

The first version does not need to:

- provide a Markdown editor;
- fetch content from Directus;
- resolve Directus records itself;
- validate whether referenced Directus items still exist;
- define generic CMS routing conventions;
- support a complicated plugin API for renderer components;
- build a second component metadata system alongside `nuxt-component-meta`;
- duplicate Comark parsing or rendering behaviour.

---

## Guiding architecture

The intended architecture is:

```text
@onderwijsin/nuxt-markdown-renderer
│
├── built-in components
│   ├── MarkdownReference (persisted node: Reference)
│   ├── MarkdownButton
│   └── MarkdownCallout
│
├── discover components/{componentsDir}/*.vue
│
├── consumer components override built-ins by name
│
├── generate Comark componentsManifest
│   └── lazy runtime rendering
│
├── componentSets
│   ├── constrain/describe components by content context
│   └── power metadata endpoints
│
├── nuxt-component-meta
│   └── transform component metadata for Directus
│
├── metadata endpoints
│   └── consumed by directus-markdown-editor-bundle
│
└── optional resolveReferencePath module
    └── used by the built-in MarkdownReference component
```

The filesystem should effectively be the source of truth for custom renderer components, with the
module deriving both runtime rendering and editor metadata from it.
