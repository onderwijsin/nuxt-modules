# Module playgrounds

Each publishable module owns an isolated Nuxt app at `modules/<module-name>/playground`. Use it to
exercise public registration, runtime code, auto-imports, components, and production-style builds.
Playgrounds extend the private [`playground-layer`](../../packages/playground-layer/README.md)
workspace package for the shared Nuxt UI shell and baseline styling.

```text
playground/
├── app/
│   └── pages/index.vue
├── nuxt.config.ts
├── package.json
└── tsconfig.json
```

Use a private workspace package that depends on both the module and `playground-layer` with
`workspace:*`, registers the public package name, and extends the shared layer:

```json
{
  "dependencies": {
    "@onderwijsin/nuxt-example": "workspace:*",
    "playground-layer": "workspace:*"
  }
}
```

```ts
import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-example"],
  appConfig: { packageName }
});
```

The shared layer owns the repository-wide `compatibilityDate: "2026-08-07"`; module-scoped
playgrounds should not repeat it in their own `nuxt.config.ts` files.

Use the established scripts:

```json
{
  "dev": "nuxt dev",
  "typecheck": "nuxt typecheck",
  "build": "nuxt build"
}
```

Run `pnpm dev:prepare` from the repository root before the first type check or build. It creates
development module stubs, builds packages needed by dependent modules, and generates Nuxt types.
Packages that expose a runtime subpath need a full module build between preparation and
`nuxt prepare`; see [package anatomy](package-anatomy.md#runtime-subpath-exports) for that
exception. Run package development and focused checks with:

```sh
pnpm --filter @onderwijsin/nuxt-example dev
pnpm --filter example-playground typecheck
pnpm --filter example-playground build
```

Keep the playground focused on observable module behavior. Do not commit generated `.nuxt`,
`.output`, or build output, and do not duplicate application-specific stores or production UI. The
layer's app shell and default page can be overridden by adding `app/app.vue` or
`app/pages/index.vue` when a module needs specialized presentation. Keep module-specific CSS in the
playground and do not duplicate the layer's Tailwind and Nuxt UI imports.
