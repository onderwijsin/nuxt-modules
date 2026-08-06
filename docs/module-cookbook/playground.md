# Module playgrounds

Each publishable module owns an isolated Nuxt app at `modules/<module-name>/playground`. Use it to
exercise public registration, runtime code, auto-imports, components, and production-style builds.

```text
playground/
├── app/
│   ├── assets/main.css
│   └── pages/index.vue
├── nuxt.config.ts
├── package.json
└── tsconfig.json
```

Use a private workspace package that depends on the module with `workspace:*` and registers the
public package name. Extend Nuxt's generated configuration with
`{ "extends": "./.nuxt/tsconfig.json" }`.

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-example"]
});
```

Use the established scripts:

```json
{
  "dev": "npm run dev:prepare && nuxt dev playground",
  "dev:build": "nuxt build playground",
  "dev:prepare": "nuxt-module-build build --stub && nuxt-module-build prepare && nuxt prepare playground"
}
```

`dev:prepare` creates the development stub, prepares the module, and generates Nuxt types. Run
package development and focused checks with:

```sh
pnpm --filter @onderwijsin/nuxt-example dev
pnpm --filter example-playground typecheck
pnpm --filter example-playground build
```

Keep the playground focused on observable module behavior. Do not commit generated `.nuxt`,
`.output`, or build output, and do not duplicate application-specific stores or production UI.
