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
pnpm add @onderwijsin/nuxt-loops-renderer @nuxt/ui @onderwijsin/loops-core
```

The application supplies `@nuxt/ui` as a peer dependency so module runtime code shares the
application's instances. Nuxt module registration remains automatic.

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

| Prop        | Required | Description                                                                         |
| ----------- | -------- | ----------------------------------------------------------------------------------- |
| `data`      | Yes      | A `LoopsLmxAst` root returned by `@onderwijsin/loops-core`.                         |
| `variables` | Yes      | Values available to `{contact.*}`, `{event.*}`, and `{data.*}` merge tags.          |
| `config`    | No       | Per-renderer overrides for debugging, styles, color mapping, themes and evaluation. |

```vue
<LoopsRenderer :data="parsedAst" :variables="variables" :config="{ applyInlineStyles: false }" />
```

The renderer supports the LMX presentation nodes used by Loops, including:

- headings, paragraphs, quotes, inline formatting, links, and line breaks;
- buttons, images, dividers, icons, and lazy-loaded media;
- ordered and unordered lists;
- sections, columns, reusable components, and conditional sections;
- safe URL handling, merge-tag resolution, and constrained inline styles.

Set `debug: true` during development to render unsupported nodes as an inline developer-only `<pre>`
block. This is not a Nuxt development overlay or production error surface. Unsupported content is
not rendered as raw HTML.

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

| Option                       | Default   | Description                                                               |
| ---------------------------- | --------- | ------------------------------------------------------------------------- |
| `enabled`                    | `true`    | Set to `false` to skip runtime registration and module dependencies.      |
| `applyInlineStyles`          | `true`    | Apply validated LMX presentation attributes as inline styles.             |
| `sourceTheme`                | Unset     | Authored AST theme: `"light"` or `"dark"`. Unset means unknown.           |
| `colorMapping.approximation` | `false`   | Select nearest-source fallback in `createLoopsColorMapper` at build time. |
| `evaluate`                   | See above | Fallbacks for missing variables and invalid conditional rules.            |

The same `applyInlineStyles`, `sourceTheme` and `evaluate` options can be overridden for an
individual `LoopsRenderer` with its `config` prop. `debug` is a per-renderer option and is intended
for development diagnostics.

Conditional sections use LMX attributes such as `if`, `ifOperation`, and `ifValue`. Evaluation never
throws; missing variables and invalid conditions use the configured fallbacks, which default to
`false`.

## Runtime color mapping

The renderer applies mappings; your application owns the mapping policy. Pass a synchronous
`config.mapColor(color, context)` callback to map exact source colors to your palette or CSS tokens.
Returning `undefined` preserves the original validated value. Without a mapper, output is unchanged.

Declare the authored theme with `sourceTheme`, either as a module default or per-renderer setting.
Pass your application's current theme as `config.targetTheme`. Both accept `"light" | "dark"`,
default to unknown, and are metadata for your callback: the renderer does not infer themes or skip
mapping automatically when they match. The AST and its ingestion/storage format stay unchanged.

For example, this wrapper supplies a 1:1 light-to-dark lookup with CSS-variable output:

```vue
<script setup lang="ts">
import { computed } from "vue";
import type { LoopsLmxAst, LoopsLmxVariables } from "@onderwijsin/loops-core";
import type {
  LoopsRendererColorProperty,
  LoopsRendererConfig,
  LoopsRendererTheme
} from "@onderwijsin/nuxt-loops-renderer";

defineProps<{ data: LoopsLmxAst; variables: LoopsLmxVariables }>();
const targetTheme = useState<LoopsRendererTheme>("campaign-theme", () => "light");
const darkColors: Partial<Record<LoopsRendererColorProperty, Record<string, string>>> = {
  color: { "#111111": "var(--campaign-text)", "#ffffff": "#111111" },
  backgroundColor: { "#ffffff": "var(--campaign-surface)", "#111111": "#eeeeee" },
  borderColor: { "#cccccc": "var(--campaign-border)" }
};
const paletteMapper = createLoopsColorMapper(darkColors);
const config = computed<LoopsRendererConfig>(() => ({
  sourceTheme: "light",
  targetTheme: targetTheme.value,
  mapColor: (color, context) =>
    context.sourceTheme === "light" && context.targetTheme === "dark"
      ? paletteMapper(color, context)
      : undefined
}));
</script>

<template>
  <button @click="targetTheme = targetTheme === 'light' ? 'dark' : 'light'">Switch theme</button>
  <LoopsRenderer :data="data" :variables="variables" :config="config" />
</template>

<style>
:root {
  --campaign-text: #eeeeee;
  --campaign-surface: #18181b;
  --campaign-border: #52525b;
}
</style>
```

For an AST authored in dark mode, set `sourceTheme: "dark"` and supply your own dark-to-light
lookup. Matching and normalization belong to your policy; source hex values retain their authored
case and length in custom callbacks. The optional palette utility below normalizes these values.

### Exact-first palette utility

`createLoopsColorMapper(mappings, options?)` is auto-imported by the module. It returns a callback
for `config.mapColor`. Palettes are separated by `color`, `backgroundColor` and `borderColor`;
targets are trusted CSS colors or variable references. Source keys accept only three- or six-digit
hex and are normalized to lowercase six-digit hex, so `#FFF` matches `#ffffff`. Invalid source keys
and duplicate normalized keys throw `TypeError` when the mapper is created.

By default the utility performs exact matches only. Enable approximation in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-loops-renderer"],
  loopsRenderer: { colorMapping: { approximation: true } }
});
```

Then use the same utility in application code:

```ts
const mapColor = createLoopsColorMapper(
  {
    color: { "#111111": "var(--campaign-text)" },
    backgroundColor: { "#ffffff": "var(--campaign-surface)" }
  },
  { maxDeltaE: 0.03 }
);
```

Pass it through `config.mapColor`, or call it inside a custom callback that selects the correct
palette for the source and target themes. The utility itself does not infer theme direction or skip
equal themes. A mapper snapshots its palette at creation; recreate it when mappings change.

The enabled strategy always tries exact matching first, then searches the same role's **source**
colors using Euclidean OKLab distance. It reuses the nearest source's mapped value without
interpreting target CSS variables. `maxDeltaE` defaults to `0.03`, must be finite and non-negative,
and is inclusive. Set it to `0` for exact-only matching in an approximation-enabled build. It has no
effect in an exact-only build. Equal-distance ties use canonical source-hex order. An empty role or
an out-of-range color returns `undefined`, preserving the original value.

Nuxt selects the utility implementation at build time. Disabled approximation has no OKLab strategy
or distance mathematics in the generated client or server bundles. An unused utility is not bundled,
even if approximation is enabled. The renderer's small callback/context integration remains
available for handwritten mappers. These module options cannot be enabled per renderer at runtime.

The exported `LoopsRendererColorMapper` receives the original validated hex plus a typed
`LoopsRendererColorContext`:

| Context field                | Meaning                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `property`                   | `color`, `backgroundColor` or `borderColor`; distinguishes text, surfaces and borders.  |
| `nodeType`, `nodeName`       | The source element type (`"element"`) and LMX name, such as `Button` or `Text`.         |
| `colors`                     | Readonly snapshot of this node's explicit validated color declarations, before mapping. |
| `backgroundColor`            | This node's explicit background, otherwise the nearest authored ancestor background.    |
| `parentBackgroundColor`      | Nearest authored ancestor background before this node's own background.                 |
| `sourceTheme`, `targetTheme` | Consumer-supplied themes, or `undefined` when unknown.                                  |

All context colors are unmapped source values. Foreground/background pairs on buttons and nested
backgrounds are available to your policy, including explicit inline text overrides. Host CSS,
computed styles, inherited host foregrounds, and Loops theme/`Style` defaults are unknown; a mapper
does not guarantee contrast. Only declarations already supported by core style validation are
mapped, including core's existing interpretation of `color` as `borderColor` on dividers/icons.

Callback results are trusted application CSS color values, including `var(...)` references. Do not
return untrusted strings. Persisted AST values still pass core validation before mapping; CSS
variables in persisted color attributes are rejected. Non-color styles and asset URLs are preserved,
and image pixels are never recolored. `applyInlineStyles: false` skips source styles and mapping.

Keep callbacks pure and deterministic for the same inputs on server and client. Pass them via the
runtime component `config` prop; do not serialize them through `nuxt.config.ts` or runtime config.
Reactive config or reactive values read by the callback update styles without reparsing the AST. Use
SSR-consistent initial theme state (as above), or stable CSS-variable output whose definitions
follow your application's theme, to avoid hydration mismatches. There is no module-owned OS-theme
detector. Automatic theme conversion is not provided; approximation only reuses consumer-supplied
mapping values. No color-library dependency is required.

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
- Node.js 24 or newer; Node.js 22 may work but is untested and unsupported

Developed and tested against Node.js 24 and Nuxt 4.5.x. Versions outside the current CI matrix are
not continuously tested. Nuxt 3 is not guaranteed.

## License

MIT
