# @onderwijsin/nuxt-loops-renderer

Nuxt 4 module for rendering Loops LMX email content from a parsed AST returned
by `@onderwijsin/loops-core`. It registers the `LoopsRenderer` component and
the recursive node components used for text, inline formatting, blocks, media,
lists, layouts, components, and icons.

## Installation

```sh
pnpm add @onderwijsin/nuxt-loops-renderer
```

Register the module in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-loops-renderer"]
});
```

The module declares `@nuxt/ui` as a Nuxt module dependency and includes
Tailwind CSS, Tailwind Typography, `simple-icons`, and `@onderwijsin/loops-core`
as runtime dependencies for the renderer.

## Usage

```vue
<LoopsRenderer
  :data="parsedAst"
  :variables="{ contact: { firstName: 'Ada' }, event: {}, data: {} }"
  :config="{ debug: import.meta.dev }"
/>
```

The AST should be parsed and persisted by a trusted backend. The renderer
validates the received AST, resolves supported variables and URLs with the
Loops Core helpers, lazy-loads images, and omits unsafe or unsupported content.
Conditional section evaluation is not enabled yet.

## Compatibility

- Nuxt 4
- Node.js 22 or newer
