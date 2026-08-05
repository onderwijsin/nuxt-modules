# @onderwijsin/nuxt-ui-form-extensions

Nuxt UI form extensions for Nuxt 4. The module provides a small foundation for
building forms that keep local edits separate from canonical application state.

The module will likely grow over time with additional form utilities as common
patterns emerge.

## Module features

- `useDraftForm` creates a deep-cloned editable draft from canonical state.
- Dirty-state tracking detects nested changes without mutating the source.
- Clean drafts follow source changes, while dirty drafts preserve local edits.
- Submission state and failed-save handling are included for async persistence.
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

`@nuxt/ui` is installed and initialized as a module dependency automatically.
The consuming application should also follow the [Nuxt UI installation
guide](https://ui.nuxt.com/docs/getting-started/installation/nuxt) for its
Tailwind CSS setup.

## Compatibility

- Nuxt 4
- Node.js 22 or newer
