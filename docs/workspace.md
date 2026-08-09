# Workspace and tooling

This repository is a pnpm workspace for standalone Nuxt 4 modules and the packages that support
them. Package versions are managed through the strict workspace catalog, and package-local scripts
are included in the root recursive validation commands.

## Requirements

- Node.js 24 for local development and CI.
- Node.js 22 or newer for published modules.
- pnpm `11.13.1`, activated once with `corepack enable`.
- Gitleaks `^8` for local secret detection and commit hooks.

Install dependencies from the repository root:

```sh
corepack enable
pnpm install --frozen-lockfile
```

Do not add a repository-local pnpm store or override the configured store location.

## Workspace discovery

The workspace automatically discovers packages in these locations:

```yaml
packages:
  - packages/*
  - modules/*
  - modules/*/playground
  - playgrounds/*
```

This means a package that follows the established layout is included by workspace commands without
edits to root scripts or configuration. Keep playgrounds private and scoped to their owning module.

## Package groups

### Supporting packages

Supporting packages live under `packages/`:

- `@onderwijsin/nuxt-module-utils` contains reusable, module-agnostic runtime helpers. It is built
  with tsup and published alongside modules with public npm access.
- `test-utils` contains shared test fixtures, assertions, and Vitest helpers. It must never be
  imported by published runtime code.

Supporting packages are type-checked recursively. `@onderwijsin/nuxt-module-utils` must be built
before workspace preparation so consuming modules can resolve its generated output. Prepare every
module stub and playground Nuxt types before type checking:

```sh
pnpm --filter @onderwijsin/nuxt-module-utils build
pnpm dev:prepare
pnpm typecheck
```

Use `dev` only when actively changing the utility; it watches and rebuilds
`packages/module-utils/dist`.

### Publishable modules

Publishable modules live under `modules/` and use the public naming convention
`@onderwijsin/nuxt-<module-name>`.

Every module owns an isolated Nuxt playground at `modules/<module-name>/playground`. The playground
depends on its module with `workspace:*`, registers the public package name, and provides `dev`,
`typecheck`, and `build` scripts. This is the repository's supported development and integration
contract.

## Working with packages

Run a package script with a pnpm filter:

```sh
pnpm --filter @onderwijsin/nuxt-example build
pnpm --filter example-playground typecheck
pnpm --filter example-playground build
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

### External consumer validation

Validate packed modules from outside the workspace by building the packages first, packing them into
a temporary artifact directory, and installing those exact archives into a clean Nuxt application:

```sh
pnpm build:utils
pnpm dev:prepare
pnpm build
pnpm pack:packages /tmp/nuxt-external-artifacts
pnpm validate:external-consumer --packages-dir=/tmp/nuxt-external-artifacts
```

The consumer is created under the system temporary directory, installs all public package tarballs,
runs `nuxt prepare` and `nuxt build`, starts the Nitro server, and checks both the rendered root
page, healthcheck routes, generated assets, protected local routes, and selected public runtime
APIs. Generated pnpm overrides force internal package dependencies to use the matching local
tarballs instead of a registry copy. The fixture uses dummy service credentials and does not call
external services. Pull request CI runs this same consumer validation after package artifacts are
produced, and the publish workflow runs it against the exact artifacts immediately before the
unchanged Changesets publish step.

The root `build` script follows workspace dependency order for `packages/*` and `modules/*`; it does
not run playground package build scripts. The recursive `typecheck` script also includes
playgrounds. Package validation checks publishable metadata and confirms that private workspace
dependencies do not leak into runtime output.

## Generated output

Do not commit generated workspace output. The following are ignored and should be regenerated
locally or in CI:

- `dist/`
- `.nuxt/`
- `.output/`
- `coverage/`
- packed `*.tgz` archives

The packed module artefact, rather than the workspace symlink, is the source of truth for release
validation. CI checks the tarball contents, declarations, private dependency leakage, and Publint
metadata.

## Tools used in the workspace

- Oxfmt formats source and documentation; Oxlint performs linting, including JSDoc descriptions.
- TypeScript and `vue-tsc` type-check packages and Nuxt applications.
- Vitest runs unit tests; `@nuxt/test-utils` supports Nuxt integration tests.
- Nuxt 4 and `@nuxt/module-builder` build modules; tsup builds private utilities.
- Changesets manages releases. Publint and packed-package checks validate npm artefacts.
- Husky, lint-staged, Commitlint, and Gitleaks `^8` provide local commit quality gates and secret
  detection.

## Validation

Run repository checks from the root:

```sh
pnpm format:check
pnpm lint
pnpm build:utils
pnpm typecheck
pnpm test
pnpm build
pnpm validate:packages
```

Apply formatting and lint fixes with `pnpm format` and `pnpm lint:fix`.
`@onderwijsin/nuxt-module-utils` must be built before workspace preparation so consuming modules
resolve its generated declarations. Preparation creates module stubs and playground Nuxt types; the
recursive build performs full production builds.
