![Stichting Onderwijs in](https://raw.githubusercontent.com/onderwijsin/.github/main/banner.png)

# @onderwijsin/nuxt-loops-renderer

Render Loops LMX email content in a Nuxt 4 application. This module turns the renderer-neutral AST
produced by `@onderwijsin/loops-core` into safe, styled Vue components that can be used in campaign
archives, previews, and other presentation surfaces.

The module is designed for content that has already been parsed on a trusted server. It validates
the AST again at the browser boundary, resolves supported variables and URLs safely, and silently
omits invalid or unsupported content.

## Getting started

Install the module:

```sh
pnpm add @onderwijsin/nuxt-loops-renderer @onderwijsin/loops-core
```

Register it in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-loops-renderer"]
});
```

Import the module stylesheet in the consuming application's main CSS file after `@nuxt/ui`:

```css
@import "tailwindcss";
@import "@nuxt/ui";
@import "@onderwijsin/nuxt-loops-renderer";
```

## Agent skill

Install the consumer-facing skill for this module with:

```sh
npx skills add onderwijsin/nuxt-modules --skill nuxt-loops-renderer
```

`@nuxt/ui` is registered as a Nuxt module dependency automatically. The renderer uses its `UButton`
and `UIcon` components.

Parse LMX with `@onderwijsin/loops-core` on the server, then pass the resulting AST and variables to
the auto-imported `LoopsRenderer` component:

```vue
<script setup lang="ts">
import type { LoopsLmxVariables } from "@onderwijsin/loops-core";

const variables: LoopsLmxVariables = {
  contact: { firstName: "Ada" },
  event: {},
  data: {}
};

const parsedAst = await getParsedCampaignAst();
</script>

<template>
  <LoopsRenderer :data="parsedAst" :variables="variables" />
</template>
```

## `LoopsRenderer` component

The component accepts the following props:

| Prop        | Required | Description                                                                      |
| ----------- | -------- | -------------------------------------------------------------------------------- |
| `data`      | Yes      | A `LoopsLmxAst` root returned by `@onderwijsin/loops-core`.                      |
| `variables` | Yes      | Values available to `{contact.*}`, `{event.*}`, and `{data.*}` merge tags.       |
| `config`    | No       | Per-renderer overrides for debugging, inline styles, and conditional evaluation. |

```vue
<LoopsRenderer :data="parsedAst" :variables="variables" :config="{ applyInlineStyles: false }" />
```

The renderer supports the LMX presentation nodes used by Loops, including:

- headings, paragraphs, quotes, inline formatting, links, and line breaks;
- buttons, images, dividers, icons, and lazy-loaded media;
- ordered and unordered lists;
- sections, columns, reusable components, and conditional sections;
- safe URL handling, merge-tag resolution, and constrained inline styles.

Set `debug: true` during development to show unsupported nodes in the Nuxt development overlay.
Unsupported content is not rendered as raw HTML.

```vue
<LoopsRenderer :data="parsedAst" :variables="variables" :config="{ debug: import.meta.dev }" />
```

## Configuration

Module defaults belong in `nuxt.config.ts` under `loopsRenderer`:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-loops-renderer"],
  loopsRenderer: {
    applyInlineStyles: true,
    evaluate: {
      onMissingVariable: false,
      onInvalidCondition: false,
      onInvalidComparison: false
    }
  }
});
```

Available module options are:

| Option              | Default   | Description                                                          |
| ------------------- | --------- | -------------------------------------------------------------------- |
| `enabled`           | `true`    | Set to `false` to skip runtime registration and module dependencies. |
| `applyInlineStyles` | `true`    | Apply validated LMX presentation attributes as inline styles.        |
| `evaluate`          | See above | Fallbacks for missing variables and invalid conditional rules.       |

The same `applyInlineStyles` and `evaluate` options can be overridden for an individual
`LoopsRenderer` with its `config` prop. `debug` is a per-renderer option and is intended for
development diagnostics.

Conditional sections use LMX attributes such as `if`, `ifOperation`, and `ifValue`. Evaluation never
throws; missing variables and invalid conditions use the configured fallbacks, which default to
`false`.

## Relationship with `@onderwijsin/loops-core`

`@onderwijsin/loops-core` is the framework-agnostic foundation. It parses LMX into a
JSON-serializable AST and provides the shared safety and interpretation helpers for:

- parsing and component expansion;
- AST validation;
- merge-tag and URL resolution;
- conditional evaluation;
- supported-node detection and constrained style values.

`@onderwijsin/nuxt-loops-renderer` is the presentation layer. It does not parse raw LMX, call the
Loops API, or provide a general-purpose HTML renderer. Instead, it maps a validated core AST to
Nuxt/Vue components, applies the application’s UI system, and chooses how supported LMX nodes appear
on screen.

Keep API keys and raw-LMX parsing on a trusted server. Pass only the parsed AST and the variables
needed by the current presentation to the client renderer.

## Compatibility

- Nuxt 4
- Node.js 22 or newer

## License

MIT
