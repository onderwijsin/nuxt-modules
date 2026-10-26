---
name: nuxt-tailwind-breakpoint
description:
  Install and use the Tailwind breakpoint badge in a Nuxt 4 application with Nuxt UI and VueUse.
---

# Tailwind breakpoint badge

Requires Node.js 24+, Nuxt 4, Nuxt UI 4, VueUse 14, Vue 3.5+, and Tailwind CSS 4.

1. Install `@onderwijsin/nuxt-tailwind-breakpoint`, `@nuxt/ui`, and `@vueuse/core`.
2. Add `"@onderwijsin/nuxt-tailwind-breakpoint"` to `modules` in `nuxt.config.ts`. The module
   registers Nuxt UI; retain the application's normal Nuxt UI CSS and `<UApp>` setup.
3. Use `@import "tailwindcss" theme(static);` followed by `@import "@nuxt/ui";` in app CSS so unused
   breakpoint variables remain available. Custom `@theme` breakpoints are supported; keep their
   units consistent.
4. Place `<TailwindBreakpoint />` once in the app or layout. It is auto-imported and client-only. To
   limit it to development, bind `v-if` to a script variable initialized from `import.meta.dev`, or
   wrap in the `<DevOnly>` component.

The subtle neutral badge uses `mdi:tailwind`; ensure Nuxt Icon's provider or local collection can
resolve it. It is fixed at the bottom left, ignores pointer events, and is hidden from assistive
technology. Its label is the largest matching breakpoint or `base` when none match or no variables
exist. Breakpoint definitions are read on mount; remount after changing them at runtime. There are
no module options, custom props, or automatic overlay injection.
