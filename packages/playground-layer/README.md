# Playground layer

Private Nuxt layer that provides the shared application shell and baseline styling used by this
repository's module playgrounds.

## What it provides

- Nuxt UI and Tailwind CSS setup through a shared Nuxt configuration.
- A consistent `UApp`, header, content container, color-mode control, GitHub link, and footer.
- Shared app configuration for the repository and publisher details.
- A fallback index page for playgrounds that do not define their own `app/pages/index.vue`.

The consuming playground can customize the package label with `appConfig.packageName` and header
actions with `appConfig.header.actions`:

```ts
import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  appConfig: { packageName }
});
```

## Usage

This package is private and is intended only for workspace playgrounds. Add it as a `workspace:*`
dependency and extend it from the playground's `nuxt.config.ts`:

```json
{
  "dependencies": {
    "playground-layer": "workspace:*"
  }
}
```

```ts
export default defineNuxtConfig({
  extends: ["playground-layer"]
});
```

Module-specific pages, components, configuration, and styles remain in the owning playground.
Project files take precedence over the layer, so a playground can provide its own `app.vue` when it
needs a specialized application shell.

## Development

The layer is consumed through the module playgrounds and has no standalone build or release
workflow. Prepare and type-check a playground from the repository root:

```sh
pnpm dev:prepare
pnpm --filter redirects-playground typecheck
pnpm --filter redirects-playground build
```

Generated `.nuxt`, `.output`, and other build output must not be committed.

## License

MIT
