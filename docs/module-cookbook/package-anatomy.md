# Module package anatomy

This cookbook is the authoritative repository contract for publishable Nuxt modules. Use it together
with nearby module implementations; patterns not listed here may still be established elsewhere in
the repository.

## Publishable modules

Each publishable module lives in `modules/<module-name>` and normally contains:

```text
modules/<module-name>/
├── __tests__/
├── playground/
├── src/
│   ├── module.ts
│   ├── config/
│   ├── runtime/
│   └── types/
├── build.config.ts (only when custom unbuild configuration is required)
├── CHANGELOG.md
├── README.md
├── package.json
└── tsconfig.json
```

Tests belong to the package they exercise. Use the public naming convention
`@onderwijsin/nuxt-<module-name>`. Published packages need repository metadata, an author, a README,
changelog, Node.js `>=22`, and exports for the generated module and declarations. Put consumer
runtime dependencies in `dependencies`, tooling in `devDependencies`, and use `workspace:*` for
private workspace dependencies.

The package's generated entrypoints normally follow this shape:

```json
{
  "files": ["dist"],
  "type": "module",
  "main": "./dist/module.mjs",
  "types": "./dist/types.d.mts",
  "exports": {
    ".": {
      "types": "./dist/types.d.mts",
      "import": "./dist/module.mjs"
    }
  },
  "publishConfig": { "access": "public" }
}
```

The packed tarball, rather than a workspace symlink, is the release source of truth: it must not
retain private workspace imports. Publish a CSS `style` export when the module exposes runtime
Tailwind classes; see [module entrypoint](module-entrypoint.md#runtime-css).

### Runtime subpath exports

When a module exposes a consumer-facing server or runtime helper in addition to its Nuxt module
entrypoint, publish it through an explicit package subpath. Keep the helper under `src/runtime/` so
the module builder emits it alongside the other runtime files, and point the export at the emitted
`.js` and `.d.ts` files:

```json
{
  "exports": {
    ".": {
      "types": "./dist/types.d.mts",
      "import": "./dist/module.mjs"
    },
    "./runtime": {
      "types": "./dist/runtime/index.d.ts",
      "import": "./dist/runtime/index.js"
    }
  }
}
```

Consumers can then import the runtime-only API without loading the Nuxt module entrypoint:

```ts
import { defineExampleComponent } from "@onderwijsin/nuxt-example/runtime";
```

Do not use a `#build` alias from published server runtime files. If runtime code needs generated
consumer imports, generate the complete server handler or plugin and register its generated file
with Nuxt Kit from the module entrypoint.

If the package exposes a runtime subpath, playground preparation must happen after a full module
build so that the emitted runtime `.js` and `.d.ts` files exist. A clean bootstrap can use:

```text
nuxt-module-build build --stub
nuxt-module-build prepare
nuxt-module-build build
nuxt prepare playground
```

The stub build is important when the module `tsconfig.json` extends `./.nuxt/tsconfig.json`; a full
build before preparation fails on a clean checkout because that generated file does not exist yet.

## Local modules

Local modules inside a consuming Nuxt application do not need package metadata, module-builder
configuration, a changelog, or a publishable playground:

```text
modules/<module-name>/
├── index.ts
├── runtime/
└── README.md
```

Register `./modules/<module-name>` in the consuming app's `nuxt.config.ts`. Local modules still use
`defineNuxtModule`, `createResolver`, and Nuxt Kit utilities. Document options and runtime exports,
but do not turn them into installable packages unless requested.

## Further Reading

- [Documentation and consumer skills](documentation-and-skills.md)
- [Migrating local modules](migrating-local-modules.md)
- [Module entrypoint and runtime registration](module-entrypoint.md)
- [Module utilities](module-utils.md)
- [Playground conventions](playground.md)
- [Patterns, conventions, and gotchas](patterns-and-conventions.md)
- [Testing modules](testing.md)
