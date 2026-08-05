# Tooling

The repository uses the following tools:

- pnpm workspaces with strict catalog versions and Corepack pinning.
- Oxfmt for formatting and Oxlint for linting.
- Oxlint's JSDoc plugin requires documented parameters and return values to include
  descriptions.
- TypeScript and `vue-tsc` for type checking.
- Vitest for unit tests and `@nuxt/test-utils` for Nuxt integration tests.
- Nuxt 4 and `@nuxt/module-builder` for module development and builds.
- Each Nuxt module root extends its generated `./.nuxt/tsconfig.json`; run
  `dev:prepare` before typechecking so Nuxt auto-import types are available.
- tsup for shared utility package builds and unbuild configuration for module
  bundling.
- Changesets for independent package versions and release changelogs.
- Publint and the repository's packed-package checks for npm artefact
  validation.
- Husky, lint-staged, and Commitlint for local commit quality gates.
- Gitleaks to prevent committing secrets.

Enable Corepack once before working with pnpm:

```sh
corepack enable
```

Run the main checks with:

```sh
pnpm format:check
pnpm lint
pnpm build:utils
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

For workspace builds and release artefact checks, run:

```sh
pnpm build
pnpm validate:packages
```

`module-utils` must be built before workspace preparation so consuming modules
can resolve its generated declarations. CI runs `build:utils` followed by
`dev:prepare` before `typecheck`. Preparation creates stubs for every module
and Nuxt types for every module playground; the recursive production build
remains responsible for full module builds.

The recursive build includes private packages, publishable modules, and
isolated playgrounds. CI additionally packs each published module, checks that
the tarball is self-contained, and runs Publint against its package metadata.
