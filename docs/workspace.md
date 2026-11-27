# Workspace and tooling

This repository is a pnpm workspace for standalone Nuxt 4 modules and the packages that support
them. Package versions are managed through the strict workspace catalog, and package-local scripts
are included in the root recursive validation commands.

Read this article for dependency, package-manager, generated-output, command, or validation work.
Agents also use it whenever a routed task requires repository checks.

For the complete event, detection, phase, and job flow, read [Continuous integration](ci.md).

## Requirements

- Node.js 24 for local development and CI.
- Node.js 24 or newer for published modules. Node.js 22 may work but is untested and unsupported.
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
catalog version must be an exact pin rather than a range. Peer dependencies describe supported
consumer versions with semver ranges; keep their development installations on exact catalog pins.
Use peers for application-owned runtimes whose identity must be shared (such as Vue and Pinia), and
for framework integrations that must use the application's installed version. Ordinary
self-contained runtime utilities remain dependencies. In user-facing documentation, use `pnpm ...`
unless Corepack itself is relevant; agents invoke the pinned version as `corepack pnpm ...`.

### Shared Vue runtime in workspace builds

The root `overrides.vue: "catalog:"` keeps transitive Vue dependencies, including Nuxt's runtime, on
the same exact version as direct workspace dependencies. A catalog alone controls only explicit
`catalog:` references; it does not align Nuxt's semver dependency with that version. Vue then
selects its matching `@vue/runtime-*`, reactivity, compiler, and server-renderer packages.

Keep this rule at the workspace boundary. Published modules continue to use application-owned
runtimes through their supported peer ranges; do not add the workspace Vue patch as a published
runtime dependency or introduce per-fixture Vue aliases and Nitro inlining.

The split Vue graph previously made Nitro omit `vue/server-renderer/index.mjs` from an otherwise
successful Loops Renderer playground build. Aligning Vue fixes the traced output without a Nitro
configuration override. After changing the Vue catalog or Nuxt version, validate a clean frozen
install in an isolated checkout, run the renderer E2E tests, and build the standalone playground:

```sh
pnpm --filter loops-renderer-playground build
node modules/loops-renderer/playground/.output/server/index.mjs
```

Request `/rendering`, `/color-mapping`, and `/approximation` from that server and check actual
rendered HTML, not only serialized payloads. Also run the packed-consumer
`--shared-runtime-regression` profile below, which deliberately uses a different Vue patch outside
the workspace override.

### Dependency release-age protection

Third-party dependency versions must be at least one day old before pnpm selects them. The workspace
enables this cooldown explicitly and strictly as a supply-chain risk reduction measure. Internal
`@onderwijsin/*` packages are excluded so workspace and release workflows can consume newly
published internal packages immediately. For a legitimate emergency, use a narrowly scoped temporary
exception for the affected dependency and remove it after adoption; do not disable the policy
globally.

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
  with tsdown and published alongside modules with public npm access.
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
pnpm validate:docs
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

The Nuxt 4.5.2 consumer pins Vite to 8.3.8 in its generated pnpm configuration. Vite 8.4 rejects
inconsistent `unctx` imports during SSR with that Nuxt version. Revisit the pin when upgrading the
consumer to a Nuxt release with the
[SSR external resolution fix](https://github.com/nuxt/nuxt/pull/36796).

When the artifacts include Module Utils, the consumer installs its Zod peer explicitly and checks
that its build helpers accept application-created schemas and the real Nuxt Kit logger. The check
compiles output-inference assertions, then exercises parsing, errors, lifecycle logging, and
disabled handling against the installed tarball.

Use `--module-utils-compatibility` with a focused Module Utils artifact set to repeat this check on
Nuxt / Nuxt Kit 4.6.2 and Zod 4.6.7. The normal profile uses the pinned workspace development
versions. This regression profile does not change the workspace pins or add a general compatibility
matrix:

```sh
pnpm pack:packages /tmp/module-utils-artifacts --packages=@onderwijsin/nuxt-module-utils
pnpm validate:external-consumer --packages-dir=/tmp/module-utils-artifacts
pnpm validate:external-consumer --packages-dir=/tmp/module-utils-artifacts --module-utils-compatibility
```

To check the Markdown renderer against Comark 0.6.2 and a consumer Vue patch different from the
workspace pin, run the packed consumer with `--markdown-runtime-regression`. This profile checks
that the renderer resolves the application's Vue, Comark, and Nuxt UI installations and that SSR
includes the configured Prose paragraph classes.

Use `--markdown-documents-prefix` with an artifact set containing Markdown Documents to repeat its
packed-consumer checks with an explicit `/raw` prefix. The normal profile checks no-prefix delivery.
Both exercise the public server declarations, root mapping, dynamic documents and neighboring
routes. The Markdown Documents consumer also installs the catalog-pinned Nuxt LLMS version used by
its playground and checks section links and full Markdown content in both generated LLMS files.

Use `--shared-runtime-regression` to check every packed module’s declared peers against the
application installation, with a Vue patch different from the workspace pin. The consumer explicitly
installs its feature peers at their catalog-pinned development versions and verifies that the
Redirects store can use the application’s active Pinia instance.

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
- Nuxt 4 and `@nuxt/module-builder` build modules; tsdown builds private utilities.
- Changesets manages releases. Publint and packed-package checks validate npm artefacts.
- Husky, lint-staged, Commitlint, and Gitleaks `^8` provide local commit quality gates and secret
  detection.

## Validation

Use the [testing guide](testing.md#selecting-verification-for-a-change) to select local checks by
affected surface and risk. Run the selected commands from the root; the full command set is:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm validate:packages
```

Apply formatting and lint fixes only to task-owned paths, using `pnpm exec oxfmt --write <paths>`
and `pnpm exec oxlint --fix <paths>`. The root `pnpm format` and `pnpm lint:fix` commands apply to
the whole repository. Root preparation builds `@onderwijsin/nuxt-module-utils` before consuming
modules. Preparation creates module stubs and playground Nuxt types; `build` performs the shared
utility build once and then runs the module-only `build:packages` phase for full production builds.

### Select additional validation by impact

The [verification selection table](testing.md#selecting-verification-for-a-change) owns the local
check policy, including documentation-only changes, focused tests, affected consumers, and when
broader checks are required. Use the package and external-consumer commands above for its build and
artifact checks. Required CI and release gates are unchanged. If a selected check cannot run, record
the exact command and blocker; a focused success does not imply that a skipped broader check passed.

`pnpm validate:docs` verifies that every public module is represented in the root README package
table and has a matching installable consumer skill under `skills/`. CI runs this guard for every
validation scope.
