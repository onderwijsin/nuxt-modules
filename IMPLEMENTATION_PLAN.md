# Nuxt Module Monorepo Implementation Plan

## Assessment snapshot

Assessment date: 2026-08-05

The repository is at the **tooling bootstrap** stage. It has a clean working
tree and no module, workspace package, CI workflow, or release implementation
yet. The initial commits establish some of the requested foundation, but the
repository does not currently meet the monorepo specification.

| Area                         | Current state                                                                                   | Specification status                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Node and package manager     | `.nvmrc` specifies Node 24; root pins `pnpm@11.13.1`; local Node is 24.16.0.                    | Partially complete: root `engines` is missing.                                                                                |
| Root package                 | ESM package with formatter/linter/hook scripts.                                                 | Incomplete: wrong package name and not private; required build, check, Changeset, package, and recursive scripts are missing. |
| pnpm workspace               | Uses strict catalog configuration and exact versions.                                           | Not started: it has no workspace discovery globs or workspace packages.                                                       |
| Formatting and linting       | Oxfmt and Oxlint configurations exist; `fmt:check` and `lint` pass.                             | Partially complete: script names/options and lint coverage do not yet match the specification.                                |
| Commit conventions           | Commitlint config and Husky hooks exist.                                                        | Partially complete: hooks invoke plain `pnpm`, the commit-message hook mutates subjects, and CI does not validate PR titles.  |
| Testing and type checking    | Root scripts exist but there is no `tsconfig`, Vitest dependency, or Vitest configuration.      | Not started: `typecheck` fails because TypeScript has no project; `test` fails because `vitest` is unavailable.               |
| Modules and shared utilities | Private packages exist under `packages/`; the first publishable module exists under `modules/`. | Partially complete: the initial module boilerplate is in place.                                                               |
| Artefact validation          | No packing, publint, Are the Types Wrong, or clean-fixture validation exists.                   | Not started.                                                                                                                  |
| Versioning and releases      | No Changesets, npm auth configuration, or workflows exist.                                      | Not started.                                                                                                                  |
| Documentation                | MIT `LICENSE` exists; no root or package README exists.                                         | Incomplete.                                                                                                                   |

### Current command evidence

- `corepack pnpm fmt:check` passes.
- `corepack pnpm lint` passes.
- `corepack pnpm typecheck` exits with TypeScript help because no `tsconfig.json`
  exists.
- `corepack pnpm test` fails because `vitest` is not installed or configured.

### Confirmed implementation inputs

- The public repository is
  [`onderwijsin/nuxt-modules`](https://github.com/onderwijsin/nuxt-modules).
  Use it in root and package repository metadata.
- The GitHub Actions secret `NPM_TOKEN` exists, is valid, and is scoped to
  `@onderwijsin`. Workflows may reference it as `NODE_AUTH_TOKEN`, but no token
  value is stored in the repository.
- An integration playground is intentionally out of scope for now. Retain the
  `playgrounds/*` workspace glob for future discovery, but create no integration
  application.
- The first production module is `@onderwijsin/nuxt-ui-form-extensions`. It is
  being introduced as a small boilerplate package before its form logic is
  implemented.

## Delivery phases

### Phase 1 — Establish the repository contract

**Goal:** turn the bootstrap repository into a valid, reproducible pnpm
workspace without publishing a module.

- Update the root package to `@onderwijsin/nuxt-modules`, set `private: true`,
  retain native ESM, and add `engines.node: >=22`.
- Add workspace discovery for `packages/*`, `modules/*`, `modules/*/playground`,
  and `playgrounds/*` to `pnpm-workspace.yaml`.
- Add root TypeScript and Vitest project configuration; make the root scripts
  match the specified command contract, including recursive build/typecheck,
  e2e, artefact checks, and Changeset commands.
- Add the required development tooling to the catalog and lockfile: Nuxt 4,
  `@nuxt/module-builder`, `@nuxt/test-utils`, Vitest, Changesets, Publint, Are
  the Types Wrong, and the TypeScript/Vue type-checking tools that the selected
  module needs.
- Align Oxfmt and Oxlint commands with the specification: `format` /
  `format:check`, `--write .`, `--deny-warnings .`, and suitable TypeScript,
  import, Node, Vitest, JSDoc, and Vue rules. Limit ESLint to Vue-template-only
  gaps, if any.
- Adjust generated-output ignores to cover `.nuxt`, `.output`, `dist`,
  `coverage`, and `*.tgz` consistently in Git, formatter, and linter configs.
- Keep existing hook functionality, but use `corepack pnpm` consistently and
  remove subject rewriting from the commit-message hook; commitlint should
  validate the authored message rather than modify it.

**Exit gate:** a fresh Node 24 checkout can run the root format, lint,
typecheck, and test commands successfully, even before a publishable module is
introduced.

### Phase 2 — Add private shared packages

**Goal:** provide the reusable, non-published foundation before modules consume
it.

- Create `packages/module-utils` as private, side-effect-free ESM with named
  exports only. Keep it free of Nuxt module registration and runtime code from
  unrelated modules.
- Create `packages/test-utils` as a private test-only workspace package.
- Keep package discovery, packed artefact inspection, leakage validation, and
  clean-consumer fixtures deferred until a real module exists to exercise them.

**Exit gate:** both private workspace packages are discovered by pnpm and pass
their package-local type checks without adding publication or validation
machinery.

### Phase 3 — Establish the first publishable Nuxt module

**Goal:** implement the initial `@onderwijsin/nuxt-ui-form-extensions` package
as a publishable Nuxt module and prove the module build path before adding its
form logic.

- Create `modules/ui-form-extensions` with the same native ESM, Node `>=22`, Nuxt
  `^4.0.0`, dist-only files, exports, generated declaration entrypoint, README,
  and changelog contracts required of a published package. Set the repository
  metadata to `onderwijsin/nuxt-modules` and configure public npm access.
- Implement `src/module.ts` using `defineNuxtModule`, explicit metadata, typed
  options, and documented Nuxt compatibility. Use Zod for external/boundary
  option validation where applicable.
- Configure `@nuxt/module-builder` so private `@repo/module-utils` imports
  are explicitly inlined/bundled and never emitted as external production
  dependencies or declaration references.
- Add focused unit tests for option normalisation and pure utilities, plus
  observable `@nuxt/test-utils` integration tests using only fixtures required
  by the module's behaviour.
- Add `modules/nuxt-starter/playground`, marked private. It must install the
  module as `workspace:*`, register it by public package name, include realistic
  configuration, and support dev, typecheck, and production build commands.
- Document the module's purpose, registration, dependency on `@nuxt/ui`, and
  compatibility in its README. Keep the initial implementation intentionally
  minimal so the form logic can be added separately.

**Exit gate:** the module builds, tests pass, and its packed artefact exposes
only the intended module entrypoint and declarations. Release automation is
still deferred until the module logic is ready.

### Phase 4 — Versioning, CI, and release controls

**Goal:** make contributions and releases safe without automatic publication.

- Add Changesets configuration for independent versions, public access, `main`
  as base branch, patch-level internal dependency updates, and both private
  utility packages ignored.
- Add CI for pull requests and pushes to `main`; validate PR title, changeset
  presence or `no-changeset` exemption, frozen install, formatting, linting,
  type checks, unit/integration tests, builds, playground checks/builds, and
  packed artefact validation. It must never version or publish.
- Add `.npmrc` containing only the environment-variable npm token configuration
  and `access=public`; never store a token in the repository.
- Add manual `prepare-release.yml`, constrained to `main`, which performs the
  complete validation suite, versions through Changesets, creates/updates
  `release/packages`, and opens a release pull request without publishing.
- Add manual `publish.yml`, constrained to `main`, which reruns release-critical
  validation, reports already-published/published/failed packages, publishes
  with `NPM_TOKEN`, pushes package-specific tags, and is safe to rerun.
- Configure repository-level GitHub merge settings outside version control:
  allow squash merges only and disable merge commits/rebase merges. Record the
  confirmed `NPM_TOKEN` secret as a deployment prerequisite and perform a
  non-publishing authentication check before the first real release.

**Exit gate:** CI succeeds on a representative PR; both workflows can be
dry-run or manually exercised without publishing unintended versions; a release
PR updates only affected package versions and changelogs.

### Phase 5 — Documentation and operational handoff

**Goal:** make the repository usable by a new module maintainer.

- Add a root README covering purpose, package table, Node/pnpm setup, local
  development, filtered playground commands, validation commands, Changesets,
  the two-step manual release procedure, and the new-module checklist.
- Promote the Phase 3 package layout and validation commands into a repeatable
  contributor workflow. Ensure a new package is discovered automatically by
  workspace, test, build, and package-validation commands without root-tooling
  edits.
- Keep isolated playgrounds as the sole development contract. Reconsider an
  integration playground only after multiple modules have a concrete,
  supported interaction to validate.
- Perform a final acceptance audit against `SPECS.md`, including a real packed
  package inspection and clean-consumer build.

**Exit gate:** a new maintainer can add and validate a module by following the
root README, and every acceptance criterion that applies to the initial module
set is demonstrably satisfied.

## Suggested implementation order

1. Phase 1 and its verification gate.
2. Phase 2, including a negative leakage test.
3. Phase 3 for the non-published starter module.
4. Phase 4 after the starter has proven the end-to-end validation path; do not
   publish until it has been replaced by a real module.
5. Phase 5 and the final acceptance audit.

This order validates the release-critical artefact path with a safe starter,
while keeping npm publication disabled until there is a real module to release.
