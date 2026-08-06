# Module entrypoint and runtime registration

Use `src/module.ts` as the entrypoint. Keep it focused on metadata, options, lifecycle, and Nuxt Kit
registration; move build-time helpers to `src/config/` and runtime behavior to `src/runtime/`.

```ts
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@onderwijsin/nuxt-example",
    configKey: "example",
    compatibility: { nuxt: "^4.0.0" }
  },
  setup(options, nuxt) {}
});
```

Type and document non-obvious options. Add Zod validation only when options have a required or
constrained runtime shape. Declare Nuxt module dependencies with `moduleDependencies` and retain
them in `dependencies` when consumers resolve them; do not use deprecated `installModule`.

## Runtime directories

Put consumer runtime files under `src/runtime`, mirroring Nuxt: `app/composables`, `app/components`,
`app/pages`, `app/plugins`, `server`, and `shared`. Register only what the module needs, and
transpile the runtime directory when required.

```ts
const resolver = createResolver(import.meta.url);
const runtimeDir = resolver.resolve("./runtime");

nuxt.options.build.transpile.push(runtimeDir);
addImportsDir(resolver.resolve(runtimeDir, "app", "composables"));
addComponentsDir({ path: resolver.resolve(runtimeDir, "app", "components") });
```

Published runtime files cannot rely on Nuxt auto-imports: they run from `node_modules`, where
runtime auto-imports are disabled. Import dependencies explicitly:

```ts
import { useRuntimeConfig } from "#imports";
import { ref } from "vue";
```

## Type templates

Store static declarations in `src/runtime/types/` and register them before an enabled guard.
`nuxt prepare` may run without consumer options but must still generate declarations.

```ts
addTypeTemplate({
  filename: "types/example.d.ts",
  src: resolver.resolve(runtimeDir, "types/example.d.ts")
});
```

`nuxt-module-build` publishes the runtime tree, not arbitrary source files. Verify static
declarations exist in `dist/runtime/types/`; use `getContents` only when types must be generated
from consumer options.

## Runtime CSS

For runtime Tailwind classes, expose a stylesheet so consuming applications can scan the published
source:

```css
/* src/runtime/index.css */
@source "./app";
```

Publish its `style` export and let consumers import it alongside application CSS.
