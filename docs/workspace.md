# Workspace

This repository uses pnpm workspaces with pnpm `11.13.1` and Node.js 22 or
newer. Local development uses Node.js 24, as specified by `.nvmrc`.

Install dependencies with:

```sh
corepack pnpm install
```

Workspace packages are discovered from:

- `packages/*`
- `modules/*`
- `modules/*/playground`
- `playgrounds/*`

Internal packages live under `packages/`. Publishable Nuxt modules live under
`modules/`.

The first publishable module is `@onderwijsin/nuxt-ui-form-extenions`, located
at `modules/ui-form-extenions`. The spelling of `extenions` is intentional and
is part of the package name.

The internal packages currently are:

- `module-utils` for reusable module-side utilities.
- `test-utils` for test-only helpers.

`module-utils` is a private built workspace package. Its tsup output lives in
`packages/module-utils/dist` and is consumed by modules through its package
exports. Use `pnpm dev` in that package to watch and rebuild the output during
active development. `test-utils` remains a private test-only source package.
Both are type-checked through the root recursive `typecheck` command.
