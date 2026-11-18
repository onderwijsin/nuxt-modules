---
"@onderwijsin/nuxt-tailwind-breakpoint": patch
---

Tailwind Breakpoint now accepts the application's `@vueuse/core` at `^14.0.0 || ^15.0.0`.
If you use VueUse 14, keep your installed version and upgrade the module to 0.1.1.
To use VueUse 15, install both in the consuming application:

```sh
pnpm add @onderwijsin/nuxt-tailwind-breakpoint@0.1.1 "@vueuse/core@^15.0.0"
```

Run `pnpm exec nuxt prepare`, `pnpm exec nuxt typecheck`, and `pnpm exec nuxt build`. Resize the
viewport and confirm the badge follows your configured Tailwind breakpoints.
