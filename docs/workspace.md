# Workspace

This repository is a pnpm workspace for standalone Nuxt 4 modules and the
private packages that support them. Package versions are managed through the
strict workspace catalog, and package-local scripts are included in the root
recursive validation commands.

## Requirements

- Node.js 24 for local development and CI.
- Node.js 22 or newer for published modules.
- pnpm `11.13.1`, activated once with `corepack enable`.

Install dependencies from the repository root:

```sh
corepack enable
pnpm install --frozen-lockfile
```

Do not add a repository-local pnpm store or override the configured store
location.

## Workspace discovery

The workspace automatically discovers packages in these locations:

```yaml
packages:
  - packages/*
  - modules/*
  - modules/*/playground
  - playgrounds/*
```

This means a package that follows the established layout is included by
workspace commands without edits to root scripts or configuration. Keep
playgrounds private and scoped to their owning module.

## Package groups

### Private packages

Private packages live under `packages/`:

- `module-utils` contains reusable, module-agnostic runtime helpers. It is
  built with tsup and its output is consumed through package exports.
- `test-utils` is reserved for shared test fixtures, assertions, and Vitest
  helpers. It must never be imported by published runtime code.

Private packages are type-checked recursively. `module-utils` must be built
before workspace preparation so consuming modules can resolve its generated
output. Prepare every module stub and playground Nuxt types before type
checking:

```sh
pnpm --filter module-utils build
pnpm dev:prepare
pnpm typecheck
```

Use `dev` only when actively changing the utility; it watches and rebuilds
`packages/module-utils/dist`.

### Publishable modules

Publishable modules live under `modules/` and use the public naming convention
`@onderwijsin/nuxt-<module-name>`. The current module is
`@onderwijsin/nuxt-ui-form-extensions` at
`modules/ui-form-extensions`.

Every module owns an isolated Nuxt playground at `modules/<module-name>/playground`.
The playground depends on its module with `workspace:*`, registers the public
package name, and provides `dev`, `typecheck`, and `build` scripts. This is the
repository's supported development and integration contract.

## Working with packages

Run a package script with a pnpm filter:

```sh
pnpm --filter @onderwijsin/nuxt-ui-form-extensions build
pnpm --filter ui-form-extensions-playground typecheck
pnpm --filter ui-form-extensions-playground build
```

Run workspace-wide checks from the root:

```sh
pnpm format:check
pnpm lint
pnpm build:utils
pnpm typecheck
pnpm test
pnpm build
pnpm validate:packages
```

The recursive build follows workspace dependency order, builds private utility
packages, then builds modules and their playgrounds. Package validation checks
publishable metadata and confirms that private workspace dependencies do not
leak into runtime output.

## Generated output

Do not commit generated workspace output. The following are ignored and should
be regenerated locally or in CI:

- `dist/`
- `.nuxt/`
- `.output/`
- `coverage/`
- packed `*.tgz` archives

The packed module artefact, rather than the workspace symlink, is the source
of truth for release validation. CI checks the tarball contents, declarations,
private dependency leakage, and Publint metadata.
