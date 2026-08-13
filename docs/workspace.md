# Workspace and tooling

This repository is a pnpm workspace for standalone Nuxt 4 modules and the packages that support
them. Package versions are managed through the strict workspace catalog, and package-local scripts
are included in the root recursive validation commands.

Read this article for dependency, package-manager, generated-output, command, or validation work.
Agents also use it whenever a routed task requires repository checks.

For the complete event, detection, phase, and job flow, read [Continuous integration](ci.md).

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

### Primary-checkout safety

Agents may work in the current checkout when its existing installation is usable. Never install
dependencies or modify, delete, relink, or repair `node_modules` in the human collaborator's primary
checkout. Run dependency-mutating commands only when the task requires dependency changes; otherwise
keep `node_modules`, `pnpm-lock.yaml`, and pnpm configuration unchanged.

If an existing `node_modules` conflicts with the required environment, use an isolated checkout or
Git worktree with its own installation. Do not reuse `node_modules` created by another environment.
In that isolated checkout, remove only its own dependency directory and run:

```sh
corepack pnpm install --frozen-lockfile
```

Integrate the completed source changes back into the current branch before handoff and do not commit
them. If isolation is unavailable or pnpm reports a store mismatch, stop and report it instead of
altering the primary checkout.

Every dependency addition or version change must reference a workspace catalog entry, and every
catalog version must be an exact pin rather than a range. In user-facing documentation, use
`pnpm ...` unless Corepack itself is relevant; agents invoke the pinned version as
`corepack pnpm ...`.

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
- `playground-layer` is a private Nuxt layer containing the shared UI shell and styling used only by
  module playgrounds. It has no standalone build or release workflow.

Supporting packages are type-checked recursively. Root `dev:prepare` builds
`@onderwijsin/nuxt-module-utils` once before preparing module stubs and playground Nuxt types:

```sh
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
pnpm typecheck
pnpm test
pnpm build
pnpm validate:packages
```

### External consumer validation

Validate packed modules from outside the workspace by building the packages first, packing them into
a temporary artifact directory, and installing those exact archives into a clean Nuxt application:

```sh
pnpm dev:prepare
pnpm build
pnpm pack:packages /tmp/nuxt-external-artifacts
pnpm validate:external-consumer --packages-dir=/tmp/nuxt-external-artifacts
```

The consumer is created under the system temporary directory, resolves a lockfile for the exact
public package tarballs, then installs from that lockfile with `--frozen-lockfile`. It runs
`nuxt prepare` and `nuxt build`, starts the Nitro server, and checks the active layer API sanity
endpoints and rendered pages, generated assets, protected local routes, and selected public runtime
APIs. Focused runs activate only layers backed by the focused artifact set; full runs activate every
module directory discovered under `modules/`. Generated pnpm overrides force internal package
dependencies to use the matching local tarballs instead of a registry copy, and the runner rejects
an incomplete internal dependency closure before installation. The fixture uses dummy service
credentials and does not call external services. Every module layer must keep its credentials and
assertions local. Pull request CI runs this same consumer validation after package artifacts are
produced, and the publish workflow runs it against the exact artifacts immediately before the
unchanged Changesets publish step.

The root `build` script builds `@onderwijsin/nuxt-module-utils` once, then follows workspace
dependency order for publishable modules under `modules/*`; it does not run playground package build
scripts. `build:packages` is the package-only phase used after preparation by CI and publishing. The
recursive `typecheck` script also includes playgrounds. Package validation checks publishable
metadata and confirms that private workspace dependencies do not leak into runtime output.

Pull request CI is change-aware to reduce repeated resource consumption. Ordinary package changes
use the `focused` execution strategy: they prepare, typecheck, and test the changed package closure.
Documentation and explicitly ignored changes use the `light` strategy, which runs only repository
formatting and lint checks. Root tooling, dependency, workflow, script, shared-package, and
ambiguous changes run the complete validation suite through the `full` strategy. The selected
strategy controls package setup and closure; the policy's emitted phases control which individual
checks execute. Repository metadata, skills, local agent configuration, generated artifacts, and
other explicitly ignored paths do not select the full package build. Merge-group diffs use the same
classification, while manual dispatch is intentionally full. Change detection fails closed when it
cannot classify a path safely.

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
pnpm typecheck
pnpm test
pnpm build
pnpm validate:packages
```

Apply formatting and lint fixes with `pnpm format` and `pnpm lint:fix`. Root preparation builds
`@onderwijsin/nuxt-module-utils` before consuming modules. Preparation creates module stubs and
playground Nuxt types; `build` performs the shared utility build once and then runs the module-only
`build:packages` phase for full production builds.

### Select additional validation by impact

| Change                                                                     | Additional validation                                                                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Focused source behavior                                                    | Run the owning package's focused Vitest target while iterating.                                            |
| Module setup, generated types, or playground integration                   | Run `pnpm dev:prepare`, the module build, and the affected playground typecheck/build.                     |
| Public package exports, dependency classification, or emitted runtime code | Run `pnpm build`, `pnpm validate:packages`, and inspect packed artefacts.                                  |
| Release-facing or pre-publish work                                         | Run `pnpm pack:packages` and `pnpm validate:external-consumer` with a unique temporary artefact directory. |

Formatting, linting, type checking, and tests remain the completion baseline when applicable. If a
check cannot run, record the exact command, its result, and the blocker; a narrower successful check
does not imply that a broader skipped check passed.
