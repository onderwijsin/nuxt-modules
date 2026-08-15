![Stichting Onderwijs in](https://raw.githubusercontent.com/onderwijsin/.github/main/banner.png)

# @onderwijsin/nuxt-ui-form-extensions

Nuxt UI form extensions for Nuxt 4. The module provides a small foundation for building forms that
keep local edits separate from canonical application state.

The module will likely grow over time with additional form utilities as common patterns emerge.

## Module features

- `useDraftForm` creates a deep-cloned editable draft from canonical state.
- Dirty-state tracking detects nested changes without mutating the source.
- Clean drafts follow source changes, while dirty drafts preserve local edits.
- Submission state and failed-save handling are included for async persistence.
- Concurrent submit calls are ignored while a save is pending, and edits made while saving are kept.
- Form composables are auto-imported by the Nuxt module.

## Installation

```sh
pnpm add @onderwijsin/nuxt-ui-form-extensions
```

Register the module in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-ui-form-extensions"]
});
```

## Agent skill

Install the consumer-facing skill for this module with:

```sh
npx skills add onderwijsin/nuxt-modules --skill nuxt-ui-form-extensions
```

`@nuxt/ui` is installed and initialized as a module dependency automatically. The consuming
application should also follow the
[Nuxt UI installation guide](https://ui.nuxt.com/docs/getting-started/installation/nuxt) for its
Tailwind CSS setup.

## Compatibility

- Nuxt 4
- Node.js 24 or newer; Node.js 22 may work but is untested and unsupported

Developed and tested against Node.js 24 and Nuxt 4.5.x. Versions outside the current CI matrix are
not continuously tested. Nuxt 3 is not guaranteed.
