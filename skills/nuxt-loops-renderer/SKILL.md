---
name: nuxt-loops-renderer
description:
  Use when integrating, configuring, debugging, or extending @onderwijsin/nuxt-loops-renderer in a
  Nuxt 4 application. It teaches agents how to install the module, pass a validated
  @onderwijsin/loops-core LMX AST to the auto-imported LoopsRenderer component, supply merge-tag
  variables, configure conditional rendering and styles, and diagnose unsupported or unsafe content.
---

# Nuxt Loops Renderer

Render Loops LMX email content in Nuxt 4. This module is the presentation layer for an
already-parsed, JSON-serializable AST from `@onderwijsin/loops-core`; it is not an LMX parser, Loops
API client, or general-purpose HTML renderer.

## Operating rules

- Keep raw LMX parsing and Loops credentials on a trusted server. Send the browser only the parsed
  AST and the variables needed by the current view.
- Treat API content as untrusted at the client boundary. `LoopsRenderer` validates `data` again and
  silently omits invalid or unsupported content.
- Prefer the public `LoopsRenderer` component and module options. Do not import runtime node
  components or depend on their internal file paths.
- Use `@nuxt/ui` styling/components as the host application expects; the module registers `@nuxt/ui`
  as a Nuxt module dependency.
- When debugging blank output, check AST validity, visible supported nodes, safe URLs, and variables
  before changing renderer code.

## Install and register

```sh
pnpm add @onderwijsin/nuxt-loops-renderer @nuxt/ui @onderwijsin/loops-core
```

The application supplies `@nuxt/ui` as a peer dependency so module runtime code shares the
application's instances. Nuxt module registration remains automatic.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-loops-renderer"]
});
```

In the consuming application's main CSS file, import the module stylesheet:

```css
@import "tailwindcss";
@import "@nuxt/ui";
@import "@onderwijsin/nuxt-loops-renderer";
```

The module targets Nuxt 4 and Node.js 24+. `LoopsRenderer` is auto-imported after registration.

## Core workflow

1. Parse or obtain the LMX on a trusted server with `@onderwijsin/loops-core`.
2. Return the parsed `LoopsLmxAst` through the application’s server/API boundary.
3. Construct `LoopsLmxVariables` for the current contact, event, and application data.
4. Render the AST with `<LoopsRenderer :data="ast" :variables="variables" />`.
5. Add per-renderer `config` only for a local override; use `nuxt.config.ts` for application
   defaults.

```vue
<script setup lang="ts">
import type { LoopsLmxVariables } from "@onderwijsin/loops-core";

const ast = await $fetch("/api/campaigns/welcome/ast");
const variables: LoopsLmxVariables = {
  contact: { firstName: "Ada", email: "ada@example.com" },
  event: {},
  data: { plan: "pro" }
};
</script>

<template>
  <LoopsRenderer :data="ast" :variables="variables" />
</template>
```

Do not pass raw LMX into `data`; parse it first. Do not put secrets in `variables` merely because a
merge tag exists.

## Public API

### `<LoopsRenderer>`

The component is auto-imported and accepts:

| Prop        | Type                  | Required | Behavior                                                                          |
| ----------- | --------------------- | -------- | --------------------------------------------------------------------------------- |
| `data`      | `LoopsLmxAst`         | yes      | Root AST returned by `@onderwijsin/loops-core`; validated again before rendering. |
| `variables` | `LoopsLmxVariables`   | yes      | Values for `{contact.*}`, `{event.*}`, and `{data.*}` merge tags.                 |
| `config`    | `LoopsRendererConfig` | no       | Per-instance diagnostics, styles, color mapping, themes and condition fallbacks.  |

```ts
import type { LoopsLmxAst, LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "@onderwijsin/nuxt-loops-renderer";

const config: LoopsRendererConfig = {
  debug: import.meta.dev,
  applyInlineStyles: false,
  evaluate: {
    onMissingVariable: false,
    onInvalidCondition: false,
    onInvalidComparison: false
  }
};
```

`debug` renders unsupported nodes in an inline developer-only `<pre>` block. It does not make
unsupported content render and should not be treated as a Nuxt overlay or production user-facing
error surface.

### Module options

Configure defaults under the `loopsRenderer` key:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-loops-renderer"],
  loopsRenderer: {
    enabled: true,
    applyInlineStyles: true,
    evaluate: {
      onMissingVariable: false,
      onInvalidCondition: false,
      onInvalidComparison: false
    }
  }
});
```

| Option                       | Type                      | Default             | Notes                                                                    |
| ---------------------------- | ------------------------- | ------------------- | ------------------------------------------------------------------------ |
| `enabled`                    | `boolean`                 | `true`              | Set false to skip runtime registration and module dependencies.          |
| `applyInlineStyles`          | `boolean`                 | `true`              | Applies validated LMX presentation attributes as inline styles.          |
| `sourceTheme`                | `"light" \| "dark"`       | unset               | Authored AST theme; omitted means unknown.                               |
| `colorMapping.approximation` | `boolean`                 | `false`             | Build-time nearest-source fallback for the auto-imported mapper utility. |
| `evaluate`                   | `EvaluateLoopsLmxOptions` | all fallbacks false | Controls invalid/missing conditional evaluation.                         |

Per-renderer `config` takes precedence over module defaults. Evaluation never throws; invalid or
missing conditional inputs use the configured fallback, normally `false`.

### Runtime color policy

Import `LoopsRendererConfig`, `LoopsRendererColorMapper`, `LoopsRendererColorContext`,
`LoopsRendererColorProperty`, `LoopsRendererColors`, `LoopsRendererColorMap`,
`LoopsRendererColorMappingOptions` and `LoopsRendererTheme` as types from
`@onderwijsin/nuxt-loops-renderer`.

- Pass a synchronous, pure `config.mapColor(color, context)` callback at runtime. Do not put
  callbacks in module options or serialized runtime configuration.
- The renderer applies mappings after core style validation; the application owns exact lookups, hex
  normalization and palette/token choices. No mapper or `undefined` preserves original values.
- `context.property` is `color`, `backgroundColor` or `borderColor`; `nodeType` is `"element"` and
  `nodeName` identifies the LMX node. `colors` contains the node's explicit validated colors before
  mapping, so button foreground/background pairs can be handled together.
- `backgroundColor` is the node's explicit source background or nearest authored ancestor
  background; `parentBackgroundColor` excludes the current node. All are unmapped source values.
  Host CSS, inherited host foregrounds and Loops `Style`/theme defaults are unknown. Mapping does
  not guarantee contrast. Core's existing `color` attribute interpretation remains `borderColor`,
  including dividers/icons; mapping does not add support for other declarations.
- Declare `sourceTheme: "light" | "dark"` in module defaults or component config; put the current
  application theme in `config.targetTheme`. Both default to unknown and reach the callback as
  metadata. Mapping is not automatically skipped for equal themes.
- Return trusted CSS color values, including `var(--token)` references. Never pass untrusted values
  through this trusted application callback. Persisted CSS variables remain rejected by core source
  validation.
- Reactive config or reactive state read inside the mapper updates rendered styles without
  changing/reparsing the AST. Keep initial SSR/client state consistent or use stable CSS tokens
  whose definitions follow the host theme. The renderer does not detect OS color mode.
- Non-color styles, URLs, image pixels and the stored AST remain unchanged.
  `applyInlineStyles: false` also disables mapping.
- Automatic theme conversion is not provided. Nearest-source matching is opt-in through the
  module-level `colorMapping.approximation` option; it never generates a new target palette.

```ts
import type {
  LoopsRendererColorMapper,
  LoopsRendererConfig
} from "@onderwijsin/nuxt-loops-renderer";

const darkText: Record<string, string> = { "#111111": "var(--campaign-text)" };
const darkSurface: Record<string, string> = { "#ffffff": "var(--campaign-surface)" };
const mapColor: LoopsRendererColorMapper = (color, context) => {
  if (context.sourceTheme !== "light" || context.targetTheme !== "dark") return undefined;
  if (context.property === "color") return darkText[color.toLowerCase()];
  if (context.property === "backgroundColor") return darkSurface[color.toLowerCase()];
  return undefined;
};
const config: LoopsRendererConfig = { sourceTheme: "light", targetTheme: "dark", mapColor };
```

Define the referenced CSS variables in the application and pass `config` to `LoopsRenderer`. For
dark-authored content, set `sourceTheme: "dark"` and provide the application's dark-to-light lookup.
See the package README for an SSR-consistent reactive theme-switching wrapper.

### Exact-first palette utility

Use auto-imported `createLoopsColorMapper(mappings, options?)` to produce a `config.mapColor`
callback. The public `LoopsRendererColorMap` type separates source-hex maps by `color`,
`backgroundColor` and `borderColor`. Targets may be trusted CSS-variable references.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-loops-renderer"],
  loopsRenderer: { colorMapping: { approximation: true } }
});
```

```ts
const mapColor = createLoopsColorMapper(
  { color: { "#111111": "var(--campaign-text)" } },
  { maxDeltaE: 0.03 }
);
```

- Default module options select exact matching only. The enabled strategy tries exact matches first,
  then the nearest source hex within the same role and maximum Euclidean OKLab distance.
- Source keys normalize lowercase and expand shorthand. Invalid keys or duplicate normalized keys
  throw `TypeError` when the mapper is created. Target values remain untouched.
- `maxDeltaE` defaults to `0.03`, must be finite and non-negative, and includes the boundary. `0`
  permits exact matches only. Distance options have no effect when approximation is disabled.
- Equal-distance ties use canonical source-hex order. No acceptable candidate returns `undefined`.
- Select the active palette according to source/target themes in application code. The utility does
  not infer direction or guarantee contrast. It snapshots mappings; recreate it when a palette
  changes, for example inside a computed getter.
- Nuxt registers only the selected utility implementation. Disabled approximation leaves OKLab code
  out of client and server bundles; unused utilities are omitted even when enabled. Keep imports on
  the public auto-imported API, not internal implementation paths.
- Renderer callback/context plumbing remains available for custom mappers. Existing handwritten
  callbacks and their `undefined` semantics do not change.

## Supported content and behavior

The renderer maps validated LMX nodes to Vue/Nuxt UI output, including headings (`H1`–`H3`),
paragraphs, quotes, inline formatting (`Strong`, `Em`, `Underline`, `Strike`, `Code`, `Text`),
links, line breaks, buttons, images, dividers, icons, code blocks, ordered/unordered lists,
sections, columns, reusable components, and conditional sections.

- Merge tags in text, alt text, and URLs are resolved from `variables`.
- Links, button targets, icon links, and image sources go through safe URL handling; unsafe or
  invalid URLs are omitted.
- Inline styles are constrained by the core package. Set `applyInlineStyles: false` when the host
  design system should control presentation.
- Unsupported nodes and invalid AST data are omitted rather than emitted as raw HTML.
- `@nuxt/ui` components such as `UButton` and `UIcon` are part of the rendered output.

Conditional sections use LMX attributes such as `if`, `ifOperation`, and `ifValue`. Supply the
complete relevant variable tree; do not assume an absent variable is truthy.

## Troubleshooting checklist

- **Nothing renders:** verify `data` is a parsed root AST, not raw LMX or an API envelope; inspect
  the server response and validate it with `loopsLmxAstSchema.safeParse(data)`.
- **Merge tags are empty:** verify the exact namespace and field (`contact`, `event`, or `data`) and
  pass a serializable value in `variables`.
- **A link/button/image disappears:** the resolved URL is likely missing or unsafe. Test the
  resolved value and use `https` or an approved relative URL.
- **Conditional content is hidden:** inspect `if`, `ifOperation`, and `ifValue`; explicitly set
  `evaluate` fallbacks while diagnosing malformed source content.
- **Styles look wrong:** confirm `applyInlineStyles` at both module and component level, then check
  the host Tailwind/Nuxt UI setup.
- **Unsupported content is expected:** use `config: { debug: import.meta.dev }` in development. Add
  support upstream in `loops-core`/this module rather than rendering arbitrary HTML.

## Extension and testing guidance

For application code, wrap `LoopsRenderer` with a page-level loading/error state and keep the
component focused on rendering. If changing the module itself, preserve the public prop/options
contract, test both valid and malformed ASTs, test safe URL omission, and verify SSR/client
compatibility. Do not reach into `LoopsAst*` internals from consuming applications.
