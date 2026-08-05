# Tooling

The repository uses Oxfmt, Oxlint, TypeScript, and Vitest.

Make sure to enable corepack before working with pnpm:

```sh
corepack enable
```

Run the main checks with:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

Apply formatting and lint fixes with:

```sh
pnpm format
pnpm lint:fix
```

Formatting covers repository source and documentation. Generated output such
as `dist`, `.nuxt`, `.output`, `coverage`, and tarballs is ignored.
