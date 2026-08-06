# Module Cookbook

This guide documents the patterns and conventions for Nuxt modules in this
repository. It is intended as a practical reference when adding or extending a
publishable module.

## Package anatomy

Each publishable module lives in `modules/<module-name>` and normally contains:

```text
modules/<module-name>/
├── __tests__/
│   ├── module.test.ts
│   └── ...
├── src/
│   ├── module.ts
│   ├── runtime/
│   │   ├── index.css
│   │   ├── types/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── composables/
│   │   │   ├── pages/
│   │   │   └── plugins/
│   │   ├── server/
│   │   ├── shared/
│   │   └── etc ...
│   └── types/             # Public TypeScript types exported by the module
├── CHANGELOG.md
├── README.md
├── package.json
└── tsconfig.json
```

Tests belong to the package they exercise. Shared package tests use the same
convention, for example `packages/module-utils/__tests__/`.

## Local modules

Local modules live inside a consuming Nuxt application's `modules/` directory
and do not need package metadata, a module-builder configuration, a changelog,
or a publishable playground. Use a root `index.ts` entrypoint and keep runtime
code beside it:

```text
modules/<module-name>/
├── index.ts
├── runtime/
│   └── app/
│       ├── composables/
│       └── plugins/
└── README.md
```

Register the local entrypoint from `nuxt.config.ts`, for example
`modules: ["./modules/static-text"]`. Local modules still use `defineNuxtModule`,
`createResolver`, and the Nuxt Kit registration utilities. Keep their runtime
exports and options documented, but do not convert them into installable
packages unless that is explicitly requested.

## Playgrounds

Each publishable module should have an isolated Nuxt application under
`modules/<module-name>/playground`. Use it to exercise the module against a
real Nuxt application while developing runtime registration, auto-imports, and
consumer-facing components.

A Nuxt 4 playground uses the application directory for Vue files and assets:

```text
modules/<module-name>/playground/
├── app/
│   ├── assets/
│   │   └── main.css
│   └── pages/
│       └── index.vue
├── nuxt.config.ts
├── package.json
└── tsconfig.json
```

Register the module by its public package name and use a workspace dependency
so the playground always exercises the local package:

```json
{
  "name": "example-playground",
  "private": true,
  "type": "module",
  "dependencies": {
    "@onderwijsin/nuxt-example": "workspace:*",
    "nuxt": "catalog:"
  }
}
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-example"]
});
```

Every playground must include the following `tsconfig.json`. Nuxt generates
`.nuxt/tsconfig.json` during preparation; extending it gives the playground
the generated aliases and types needed by `nuxt typecheck`:

```json
{
  "extends": "./.nuxt/tsconfig.json"
}
```

Expose a module-level convenience script for local development:

```json
{
  "scripts": {
    "dev": "npm run dev:prepare && nuxt dev playground",
    "dev:build": "nuxt build playground",
    "dev:prepare": "nuxt-module-build build --stub && nuxt-module-build prepare && nuxt prepare playground"
  }
}
```

Run `dev:prepare` before starting the playground. It creates the development
stub for the package entrypoint, prepares the module, and generates the
playground's Nuxt types. The `dev` script then starts the playground, while
`dev:build` builds the playground for a production-style check. Keep these
scripts aligned with the starter module convention.

Run it from the module directory or through the workspace filter:

```sh
cd modules/<module-name>
pnpm dev

# Or from the repository root:
pnpm --filter @onderwijsin/nuxt-example dev
```

The playground is also part of the workspace validation contract. Run its
checks directly when iterating, or use the root recursive commands to include
all module playgrounds:

```sh
pnpm --filter example-playground typecheck
pnpm --filter example-playground build
pnpm typecheck
pnpm build
```

Do not commit generated `.nuxt`, `.output`, or other build output from a
playground. Keep the example focused on observable module behavior rather than
duplicating application-specific stores or production UI.

## Package metadata

Use the repository naming convention:

```json
{
  "name": "@onderwijsin/nuxt-example",
  "type": "module",
  "files": ["dist"],
  "main": "./dist/module.mjs",
  "types": "./dist/types.d.mts",
  "publishConfig": {
    "access": "public"
  }
}
```

Published packages must include repository metadata, a README, a changelog,
Node.js `>=22` engine support, and an `exports` map for the generated module
and declarations. Runtime dependencies belong in `dependencies`; build and
type-check tooling belongs in `devDependencies`.

Use `workspace:*` for private workspace dependencies. Workspace dependencies
are not assumed to be bundled automatically: `@nuxt/module-builder` uses
unbuild, whose default is to externalize dependencies. Explicitly inline every
private runtime dependency that must be self-contained in the published
package.

Private shared packages should build their own runtime dependency graph first.
This repository uses tsup for `module-utils`, which bundles its runtime
dependency `scule` into `packages/module-utils/dist`. The consuming Nuxt module
then only needs to inline the built `module-utils` package:

`packages/module-utils/tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/types.ts"],
  format: ["esm"],
  dts: true,
  bundle: true,
  noExternal: ["scule"]
});
```

`modules/<module-name>/build.config.ts`:

```ts
import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  rollup: {
    inlineDependencies: ["module-utils"]
  }
});
```

The package name in `inlineDependencies` must match the dependency name in the
module's `package.json`. Private workspace utilities that are only build input
should be declared in `devDependencies`; they must not remain as consumer
runtime dependencies after bundling. Build shared packages before consuming
modules, or use the workspace's recursive build so the dependency order is
respected. Keep this build config even though unbuild can implicitly bundle the
workspace package: explicit inlining suppresses the implicit-bundling warning,
which otherwise fails this repository's warning gate. After building, inspect
`dist/module.mjs` or the packed tarball to confirm that no private workspace
import remains.

## Module entrypoint

The entrypoint is `src/module.ts`. Define the module with `defineNuxtModule`
and keep its metadata explicit:

```ts
import { defineNuxtModule } from "@nuxt/kit";

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@onderwijsin/nuxt-example",
    configKey: "example",
    compatibility: {
      nuxt: "^4.0.0"
    }
  },
  setup(options, nuxt) {
    // Register module behavior here.
  }
});
```

Keep options typed and document non-obvious options with JSDoc. Add runtime
validation when an option is required or must have a specific shape, such as
an enum. If every option is optional and ordinary TypeScript types are enough,
do not add validation just for the sake of having a schema.

Keep `src/module.ts` focused on module orchestration: metadata, lifecycle,
option validation, and Nuxt Kit registration. Do not place helper functions,
token maps, CSS generation, or other module-specific utilities inline in the
entrypoint. Put them in one or more focused files under `src/config/` (for
build-time configuration) or the appropriate `src/runtime/` directory (for
runtime behavior), and import them into the entrypoint. This keeps the module
definition readable and makes pure configuration behavior straightforward to
test without bootstrapping Nuxt.

When validation is useful, define the Zod fields as a plain object in a
module-local schema file:

```ts
// src/config/options.schema.ts
import { z } from "zod";

export default {
  mode: z.enum(["development", "production"]),
  endpoint: z.url()
};
```

Import that object in the module entrypoint and validate the raw options after
the enabled check:

```ts
import schema from "./config/options.schema";
import { validateModuleOptions } from "module-utils";

setup(rawOptions, nuxt) {
  const log = useLogger("example");
  const { isEnabled } = moduleSetup("@onderwijsin/nuxt-example", rawOptions, log);

  if (!isEnabled()) {
    return;
  }

  const options = validateModuleOptions(rawOptions, schema, log);
  // options is validated, includes enabled: true by default, and is type-safe.
}
```

`validateModuleOptions` combines the plain schema object with the shared
`enabled: z.boolean().default(true)` field. See the loops-renderer module for
the complete implementation pattern. Do not create a validation schema for a
module whose options do not need runtime validation.

## Module dependencies

Declare dependencies on other Nuxt modules with `moduleDependencies` so Nuxt
can install them in the correct order and validate their versions:

```ts
moduleDependencies: {
  "@nuxt/ui": {
    version: ">=4.0.0"
  }
}
```

Keep the dependency in the package's `dependencies` as well when consumers
must be able to resolve it from the published package. Prefer the dependency
declaration over calling the deprecated `installModule` helper.

## Runtime registration

Put consumer-facing runtime code under `src/runtime`, mirroring Nuxt's root
directory structure. Application code belongs under `src/runtime/app`, while
server and shared code belongs under their corresponding runtime directories.
Common patterns include:

- `runtime/app/composables/` for auto-imported application composables;
- `runtime/app/components/` for globally registered application components;
- `runtime/app/pages/` for module-provided pages;
- `runtime/app/plugins/` for application plugins;
- `runtime/server/` for server handlers or server utilities;
- `runtime/shared/` for code shared between the application and server.

Register only the runtime directories the module needs. For composables, use
`addImportsDir` and transpile the runtime directory when required:

```ts
const resolver = createResolver(import.meta.url);
const runtimeDir = resolver.resolve("./runtime");

nuxt.options.build.transpile.push(runtimeDir);
addImportsDir(resolver.resolve(runtimeDir, "app", "composables"));
addComponentsDir({ path: resolver.resolve(runtimeDir, "app", "components") });
```

Runtime files should import their Vue or framework dependencies explicitly when
they are also unit-tested as package source. This makes the runtime behavior
clear and avoids relying on application-only auto-imports during tests.

### Published runtime files cannot rely on auto-imports

Published modules must not rely on Nuxt auto-imports from files inside their
`src/runtime/` directory. Auto-imports are not enabled for files in
`node_modules`—where a published module is installed—for performance reasons.
An import that works in the local playground can therefore fail for consumers.

Runtime files must import dependencies explicitly, using `#imports` or another
stable package or Nuxt alias where appropriate:

```ts
import { useRuntimeConfig } from "#imports";
import { ref } from "vue";
```

The module may still register consumer-facing composables and components with
`addImportsDir` and `addComponentsDir`; those registrations make the APIs
available to the consuming application. They do not make unqualified
auto-imports available inside the published module's own runtime files.

### Type templates

For a static declaration registered with `addTypeTemplate`, keep the source file
under `src/runtime/types/` and reference it with `src`:

```ts
const resolver = createResolver(import.meta.url);
const runtimeDir = resolver.resolve("./runtime");

addTypeTemplate({
  filename: "types/example.d.ts",
  src: resolver.resolve(runtimeDir, "types/example.d.ts")
});
```

This location is required because `nuxt-module-build` publishes the module
entrypoint and the `src/runtime/` tree. It does not copy arbitrary files from
other source directories such as `src/types/`. A file referenced by
`addTypeTemplate({ src })` is resolved from the built package when the
consumer's Nuxt application starts, so it must exist in `dist/`.

Use `getContents` only when the declaration must be generated from consumer
options or other build-time values. Static declarations should remain files so
they are easier to read, edit, and typecheck.

### Runtime CSS

When runtime components use Tailwind utility classes, expose a package CSS
entrypoint so consumer applications can scan the module's runtime source:

```css
/* src/runtime/index.css */
@source "./app";
```

Expose that stylesheet through the package's style export condition:

```json
{
  "style": "./dist/runtime/index.css",
  "exports": {
    ".": {
      "style": "./dist/runtime/index.css"
    }
  }
}
```

Consumers can then include the module's utilities alongside their application
stylesheet:

```css
@import "tailwindcss";
@import "@onderwijsin/nuxt-loops-renderer";
```

This follows the same pattern used by Nuxt UI. The @source path is relative
to the published stylesheet, so it continues to work from node_modules.

## Shared utilities

Put reusable module setup helpers in `packages/module-utils`. Keep those
helpers framework-facing but module-agnostic: naming, logger scopes, prepare
mode detection, and common setup lifecycle behavior are appropriate examples.

Keep module-specific behavior in the consuming module. Do not move a utility
into the shared package until it is genuinely reusable across modules.

## Testing

Use Vitest and keep tests next to the package:

```text
packages/module-utils/__tests__/setup.test.ts
modules/ui-form-extensions/__tests__/module.test.ts
modules/ui-form-extensions/__tests__/draft-form.test.ts
```

Test pure utilities directly. For a module entrypoint, verify metadata,
declared module dependencies, enabled setup behavior, and disabled setup
behavior. For runtime composables, test observable behavior such as cloning,
dirty-state transitions, source synchronization, successful submission, and
error handling.

Prefer focused unit tests for pure and setup logic. Add Nuxt integration tests
when behavior depends on generated Nuxt configuration, auto-import resolution,
component registration, or build output.

## Documentation and validation

Every module README should cover installation, registration, features,
compatibility, and important dependencies. Keep the package changelog in the
module directory.

Before handing off a module change, run the repository checks:

```sh
pnpm fmt
pnpm lint:fix
pnpm typecheck
pnpm test
pnpm build
```

The recursive build produces `packages/module-utils/dist` before building
dependent modules. A package-local build can be run with:

```sh
cd packages/module-utils
pnpm build
```

For active development, run the shared utility in watch mode:

```sh
cd packages/module-utils
pnpm dev
```

The watcher rebuilds `dist` whenever the utility source changes. Run the
dependent module build or Nuxt playground separately when you need to consume
the updated output.

For package-specific iteration, run the equivalent command from the package or
use the repository's filtered pnpm command. Do not commit generated `dist`
output unless the repository explicitly adopts that convention.
