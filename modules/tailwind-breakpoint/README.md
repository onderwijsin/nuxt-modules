# @onderwijsin/nuxt-tailwind-breakpoint

A fixed Nuxt UI badge showing the active Tailwind CSS breakpoint. It reads the application's
computed `--breakpoint-*` CSS variables and reacts to viewport changes through VueUse.

## Installation

Requires Node.js 24+, Nuxt 4, Nuxt UI 4, VueUse 14, Vue 3.5+, and Tailwind CSS 4.

```sh
pnpm add @onderwijsin/nuxt-tailwind-breakpoint @nuxt/ui @vueuse/core
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-tailwind-breakpoint"]
});
```

The module registers Nuxt UI as a module dependency. Follow Nuxt UI's normal application setup,
including its CSS imports and `<UApp>` wrapper.

## Usage

Place the auto-imported component once in your app or layout:

```vue
<template>
  <UApp>
    <NuxtPage />
    <TailwindBreakpoint />
  </UApp>
</template>
```

The component renders only on the client. It displays the largest matching breakpoint name, or
`base` below the smallest breakpoint (also when no breakpoint variables are available). It uses a
subtle neutral badge with the `mdi:tailwind` icon, fixed at the bottom left, ignores pointer events,
and is hidden from assistive technology. Nuxt Icon must be able to resolve `mdi:tailwind` through
its configured provider or local collection.

To show it only in development, use `v-if="isDev"` with `const isDev = import.meta.dev` in your
app's `<script setup>`. An even simpler usage is with teh
[`<DevOnly />`](https://nuxt.com/docs/4.x/api/components/dev-only) component:

```vue
<template>
  <UApp>
    <NuxtPage />
    <DevOnly>
      <TailwindBreakpoint />
    </DevOnly>
  </UApp>
</template>
```

## Tailwind configuration

Tailwind normally omits unused theme variables. Emit your theme variables with `theme(static)` in
the application's CSS so every breakpoint is available:

```css
@import "tailwindcss" theme(static);
@import "@nuxt/ui";

@theme {
  --breakpoint-3xl: 120rem;
}
```

Custom breakpoint names are supported. Keep breakpoint units consistent, as required by Tailwind.
Variables are read when the component mounts; runtime changes to breakpoint definitions require
remounting it. There are no module options, custom props, or automatically injected overlays.
