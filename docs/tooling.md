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

For release artefact checks, run:

```sh
pnpm build
pnpm validate:packages
```

CI additionally packs each published module, checks that the tarball is
self-contained, and runs Publint against its package metadata.
