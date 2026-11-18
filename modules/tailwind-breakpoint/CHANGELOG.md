# Changelog

## 0.1.1

### Patch Changes

- 0ed629d: Tailwind Breakpoint now accepts the application's `@vueuse/core` at `^14.0.0 || ^15.0.0`.
  If you use VueUse 14, keep your installed version and upgrade the module to 0.1.1.
  To use VueUse 15, install both in the consuming application:

  ```sh
  pnpm add @onderwijsin/nuxt-tailwind-breakpoint@0.1.1 "@vueuse/core@^15.0.0"
  ```

  Run `pnpm exec nuxt prepare`, `pnpm exec nuxt typecheck`, and `pnpm exec nuxt build`. Resize the
  viewport and confirm the badge follows your configured Tailwind breakpoints.

## 0.1.0

### Minor Changes

- 5450da2: Add a client-only TailwindBreakpoint component that displays the active Tailwind CSS breakpoint using Nuxt UI and VueUse.
