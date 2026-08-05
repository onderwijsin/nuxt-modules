# Tooling

The repository uses Oxfmt, Oxlint, TypeScript, and Vitest.

Run the main checks with:

```sh
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
```

Apply formatting and lint fixes with:

```sh
corepack pnpm format
corepack pnpm lint:fix
```

Formatting covers repository source and documentation. Generated output such
as `dist`, `.nuxt`, `.output`, `coverage`, and tarballs is ignored.
