# @onderwijsin/nuxt-markdown-renderer

Nuxt 4 module that provides an auto-registered `MarkdownRenderer` component. The component is a
minimal rendering surface for now and currently renders an empty `<div />`.

## Install and register

```sh
pnpm add @onderwijsin/nuxt-markdown-renderer
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"]
});
```

Use the component in any Nuxt template:

```vue
<template>
  <MarkdownRenderer />
</template>
```

The module requires Nuxt 4 and Node.js 24 or newer.

## Configuration

The module is enabled by default. Disable setup with:

```ts
export default defineNuxtConfig({
  markdownRenderer: { enabled: false }
});
```

## Development

```sh
pnpm --filter markdown-renderer-playground dev
pnpm --filter markdown-renderer-playground typecheck
```
