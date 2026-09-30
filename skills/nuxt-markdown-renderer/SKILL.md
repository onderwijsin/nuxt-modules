# Nuxt Markdown Renderer

Use `@onderwijsin/nuxt-markdown-renderer` to add the auto-registered `MarkdownRenderer` component to
a Nuxt 4 application.

## Setup

```sh
pnpm add @onderwijsin/nuxt-markdown-renderer
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"]
});
```

## Component

```vue
<template>
  <MarkdownRenderer />
</template>
```

The initial component renders an empty `<div />`; Markdown parsing and rendering behavior will be
added in a later change. The module is enabled by default and can be disabled with
`markdownRenderer: { enabled: false }`. Requires Nuxt 4 and Node.js 24 or newer.
