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

The internal packages currently are:

- `@repo/module-utils` for reusable module-side utilities.
- `@repo/test-utils` for test-only helpers.

Both packages are source-only workspace packages and are type-checked through
the root recursive `typecheck` command.
