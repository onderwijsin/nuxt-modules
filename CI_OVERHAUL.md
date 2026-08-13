# CI overhaul plan

## Goal

Address issues #141, #142, #147, #148, and #149 in one coherent pull request by making CI
classification phase-aware, keeping merge-queue validation safe, and eliminating avoidable repeated
workspace builds. The implementation must preserve fail-closed behavior and the repository's real
`dist`/packed-consumer contracts. The plan also includes a configurable CI policy, a temporary
external-consumer safety mode, and a dedicated end-to-end CI article.

This file is an implementation planning artifact. It must be removed before the pull request is
submitted.

## Incoming change to synchronize first

PR #154 (`chore: add Varlock Proton Pass playground environments`) is currently in the merge queue
and must be incorporated into this worktree before implementation begins. It changes CI workflows,
package/workspace metadata, the lockfile, and playground environment loading. The implementation
sequence is therefore:

1. Wait for or otherwise incorporate the exact PR #154 result into the current worktree; do not
   implement against the pre-Varlock CI snapshot.
2. Re-run repository status and inspect the resulting CI, scripts, package manifests, lockfile, and
   environment documentation.
3. Preserve the new `install-proton-pass-cli` local action, `PROTON_PASS_PERSONAL_ACCESS_TOKEN`,
   `pnpm varlock:load`, and required environment setup in every focused/full job that prepares or
   builds playgrounds.
4. Reclassify the new paths introduced by PR #154. Varlock/Proton Pass setup or environment schema
   changes are not light when they can affect a playground build; isolated documentation remains
   light.
5. Record the final PR #154 base/merge SHA and any conflicts as implementation evidence. If the PR
   changes materially beyond the described scope, pause and revisit this plan before coding.

## Findings from the issues and current repository

### Issue relationships

- **#147** identifies a classification bug: ignored/docs-only changes currently produce `full=false`
  and an empty package set, so the focused job still installs dependencies and runs package
  preparation.
- **#149** is the governing design issue. It asks for a three-way overall scope plus independent
  validation phases, while retaining affected packages and transitive dependents.
- **#142** applies that model to merge groups. Merge-queue validation must remain required because
  it validates a synthetic commit, but it should classify the merge-group diff instead of forcing a
  full run merely because the event is not `pull_request`.
- **#141** exposes duplicate dependency orchestration. Focused CI explicitly builds `module-utils`,
  then invokes dependency-inclusive `dev:prepare` once per selected package. Package lifecycle hooks
  in `healthcheck` and `sentry-config` also build `module-utils` themselves.
- **#148** exposes duplicate module artifact generation. Many modules run a stub build, prepare, and
  then a real build during `dev:prepare`; full CI subsequently runs the workspace build again. The
  issue explicitly warns that some real builds are required because downstream packages consume
  module subpath exports.

### Current implementation evidence

- `scripts/detect-changes.mjs` currently emits only `full`, `packages`, and `test_paths`.
- It treats every non-PR event as full because it has no merge-group diff path.
- It classifies all `.github/**` and `scripts/**` changes, the lockfile, root package metadata,
  workspace configuration, and several root configs as repository-wide.
- `.github/workflows/ci.yml` runs the focused job whenever `full == false`, including with an empty
  package list, and loops over `pnpm --filter "$package"... run dev:prepare` for every package.
- The full job runs `pnpm build:utils`, `pnpm dev:prepare`, checks, and then `pnpm build`; the
  current package scripts therefore allow the same producer/module artifact to be generated in
  multiple phases.
- `@onderwijsin/nuxt-module-utils` is a published workspace package with multiple exported `dist`
  subpaths. Most modules declare it as a workspace dependency. `healthcheck`, `directus-client`, and
  `directus-sitemaps` add workspace dependency edges involving `module-utils` or other modules, so
  dependency order is a real contract rather than an optimization detail. The graph must be derived
  automatically from every workspace package manifest; these packages are representative regression
  fixtures, not a manually maintained allowlist.
- Only `healthcheck` and `sentry-config` currently contain explicit `prebuild`/ `predev:prepare`
  hooks for `module-utils`; the root CI also builds it explicitly.
- The repository has no dedicated detector test suite today. Change-detection behavior must become
  directly testable without requiring a GitHub Actions runner.

## Proposed target model

### Detector output

Replace the boolean-only result with a structured, explicit result. Store the validation policy in a
versioned repository-owned configuration module, for example `ci/validation-policy.mjs` (or
`.github/ci-policy.mjs` if that better matches the final layout). JavaScript is preferred over YAML
or JSON because it supports comments, named predicates, and policy validation without adding a
parser dependency; the exported object should still be data-shaped and easy to inspect.

The detector imports this policy, validates its shape, and emits a JSON result. This gives
maintainers a small API for changing path-to-phase behavior without rewriting workflow YAML. The
workflow should receive at least:

```text
scope=light|focused|full
packages=<selected package names, including transitive dependents>
test_paths=<selected test paths>
phases=<format,lint,...>
prepare=none|affected|all
typecheck=none|affected|all
test=none|affected|all
build=none|affected|all
validate_packages=false|true
pack=false|true
external_consumer=false|true
force_external_consumer_check=true|false
```

Use a machine-readable output for the phase matrix so adding a phase does not require fragile
boolean combinations in YAML. Keep human-readable scope, reason, packages, and phases in the Actions
job summary. Include the policy version and any forced safety overrides in that summary.

Invalid policy configuration must fail closed to full validation, not silently produce a partial
matrix.

The classifier remains conservative:

1. No trustworthy diff, an empty diff, or an unclassified/ambiguous path selects `full`.
2. A change can only select `light` when every changed path is explicitly known not to affect
   package behavior.
3. Any package-affecting path selects `focused` or `full`, never `light`.
4. Adding a documentation/change-set file alongside a source or config file must select the latter
   path, not the light path.

### Reference phase matrix

The following is the starting contract to encode as rules and tests. A rule may conservatively
upgrade a phase or scope when its effect cannot be proven.

| Change class                                   | Scope                                                                    | Prepare                                           | Typecheck                     | Tests                | Build                            | Package/pack                        | External consumer                         |
| ---------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------- | ----------------------------- | -------------------- | -------------------------------- | ----------------------------------- | ----------------------------------------- |
| README/docs/changeset/explicitly ignored only  | light                                                                    | no                                                | no                            | no                   | no                               | no                                  | no                                        |
| Test files only                                | focused                                                                  | only when selected tests need generated artifacts | affected closure              | affected test paths  | no by default                    | no                                  | no                                        |
| Module/package source                          | focused                                                                  | affected producers/consumers                      | affected closure              | affected closure     | affected artifacts               | when public artifact may change     | when public contract may change           |
| Manifest/exports/package metadata              | focused or full as appropriate                                           | affected closure                                  | affected closure              | relevant             | affected                         | yes                                 | yes                                       |
| Shared published utility source                | focused with all dependents, or full if ambiguous                        | required producers                                | all dependents                | all dependents       | required artifacts               | yes                                 | yes                                       |
| Vitest/test configuration                      | focused/full test scope                                                  | only if tests require it                          | no unless TS is also affected | all tests            | no                               | no                                  | no                                        |
| TypeScript configuration                       | focused/full typecheck scope                                             | as needed                                         | relevant/all typecheck        | no by default        | only if build config is affected | no by default                       | no by default                             |
| Module-builder/build configuration             | focused/full build scope                                                 | required                                          | relevant                      | relevant smoke tests | relevant/all                     | relevant                            | relevant                                  |
| Formatting/lint configuration                  | focused                                                                  | no                                                | no                            | no                   | no                               | no                                  | no                                        |
| CI orchestration workflow                      | phases affected by that workflow, conservatively full when unclear       | phase-dependent                                   | phase-dependent               | phase-dependent      | phase-dependent                  | phase-dependent                     | phase-dependent                           |
| Release-only/notification workflow or metadata | light unless the classifier cannot prove isolation                       | no                                                | no                            | no                   | no                               | no                                  | no                                        |
| Dependency/lockfile change                     | based on importer/dependency impact; full when not reliably attributable | based on impact                                   | based on impact               | based on impact      | based on impact                  | usually if build/runtime dependency | when resolved runtime artifact can change |
| Root workspace/package-manager configuration   | full by default                                                          | all                                               | all                           | all                  | all                              | yes                                 | yes                                       |
| Merge group                                    | same classifier against the merge-group diff                             | same as classified change                         | same                          | same                 | same                             | same                                | same                                      |
| Manual dispatch/scheduled safety run           | full                                                                     | all                                               | all                           | all                  | all                              | yes                                 | yes                                       |

For the duration of this overhaul, the policy enables `force_external_consumer_check`. This
temporary safety override forces the external-consumer job for every non-light validation that
produces publishable artifacts. That job must build the required workspace artifacts itself, pack
those freshly built artifacts, and run the clean external consumer against those exact archives.
This intentionally costs extra CI compute while orchestration changes and prevents a buggy scope or
phase split from silently allowing broken published packages.

After the overhaul passes the full regression and timing review, disable the flag in an obvious
policy change (or remove it in this PR only after the evidence is recorded). The final handoff must
state whether the temporary flag remains enabled at merge time and why.

The matrix is a reference contract, not permission to make speculative skips. In particular, phase
classification must not weaken package validation when a changed manifest, export, generated output,
or runtime dependency can affect a packed consumer.

### Merge-group diff

Keep the `merge_group` workflow trigger and required check. For a merge-group run, determine the
changed paths between the merge group's base and head/synthetic SHA, then feed those paths through
the same classifier used for pull requests. Confirm the exact available event fields and checkout
history in the implementation slice; if the base cannot be resolved safely, the detector must emit
`full` rather than silently selecting a narrower scope.

The merge group must produce a check result even when the selected scope is `light`, so required
branch protection checks remain predictable. The workflow should use explicit light/focused/full
jobs (or a single matrix-driven job) rather than making a skipped focused job stand in for success.

In plain terms, the merge-group base is the commit from which the synthetic merge-group commit was
constructed. We need the file diff from that base to the synthetic head, not merely the last PR
commit, because the merge queue may combine multiple pull requests. Prefer the base SHA supplied by
the event payload or a verified local ancestry relationship. If it cannot be resolved safely, use
full validation.

### Build and prepare orchestration

Separate the concepts that are currently mixed together:

1. Discover every workspace package and its `workspace:` dependencies from the workspace globs and
   package manifests, then build workspace producers once in the derived dependency order. New
   workspace dependencies must automatically affect the closure; adding a dependency must never
   require editing a second CI dependency list.
2. Prepare selected modules/playgrounds once, in one pnpm invocation or an explicit dependency-aware
   orchestration step; do not loop over overlapping `--filter ...` graphs.
3. Run checks against the prepared output.
4. Build only artifacts not already built by the explicit prepare/build phase, or make the final
   build phase the one authoritative production build and ensure preparation uses the already-built
   artifact. Do not rely on an accidental existing `dist` directory.
5. Validate package metadata, pack, and run the external consumer only when the phase matrix selects
   those phases.

First verify whether `nuxt-module-build build --stub` provides a capability not provided by a real
build. For modules with downstream subpath consumers, test real build → module prepare → playground
prepare from a clean output directory. Remove the stub only after those checks prove it redundant.
Do not remove `nuxt-module-build prepare` or `nuxt prepare playground` without an independent proof
of their responsibilities.

Remove sibling rebuild lifecycle hooks from module manifests once root orchestration guarantees the
producer is built. Normalize the common package-script pattern in this PR, including all proven
`module-utils` consumers, while preserving deliberate module differences. Preserve local developer
commands by making their dependency/build order explicit at the owning root/package command rather
than depending on hidden `pre*` hooks.

The external-consumer safety mode must not rely on artifacts produced by an earlier job: it should
build and pack in the consumer job, then run the consumer. The normal optimized artifact-download
path can remain as a separately tested mode for eventual use after the temporary override is
disabled.

## Small implementation subtasks

Each subtask should be independently reviewable and leave the repository in a runnable state.

### 1. Establish detector fixtures and a stable test seam

- Extract pure classification/phase functions from `scripts/detect-changes.mjs`, or add a narrowly
  scoped fixture-driven entry point, without adding a runtime dependency.
- Add tests for light, focused, full, mixed docs+source, direct package changes, transitive
  dependents, automatic discovery of newly added workspace dependencies, unknown paths,
  empty/unavailable diffs, and manual/merge-group events.
- Add the configurable policy module and shape validation before changing workflow conditions.
- Decide and document the serialized output shape before changing workflow conditions.

### 2. Introduce explicit light scope (#147)

- Emit `scope=light` for docs, changesets, and explicitly ignored paths only.
- Add a lightweight successful CI job that runs `format:check` and `lint`.
- Prefer running those checks without a full dependency install. First verify whether the runner or
  tool cache provides the pinned Oxfmt/Oxlint binaries; if not, use the smallest documented tool
  install path. Do not run package preparation, builds, typechecks, or tests in the light job.
- Ensure the required CI status is reported for light PRs and merge groups, including mixed-path
  safeguards.

### 3. Make merge-group detection affected-aware (#142)

- Resolve and test the merge-group base/head comparison.
- Remove the unconditional non-PR full fallback only when a trustworthy merge-group diff is
  available; retain full fallback otherwise.
- Route merge groups through the same scope/phase outputs and retain full manual dispatch behavior.

### 4. Implement phase-aware workflow orchestration (#149)

- Replace the current `full` job predicates with scope/phase predicates or a matrix.
- Run only the selected phases and package closure, while keeping the job summary explicit about
  selected scope, packages, and phases.
- Classify workflow, script, config, and lockfile paths by actual validation impact where reliable;
  fail closed for ambiguous cases.
- Keep third-party action SHA pins and minimum permissions intact.
- Carry forward PR #154's Proton Pass CLI installation and `pnpm varlock:load` before playground
  preparation/build phases.
- Drive the workflow from the configurable policy/result rather than duplicating path rules in YAML.

### 5. Remove duplicate dependency traversal (#141)

- Replace the focused per-package dependency-inclusive loop with one invocation driven by the
  automatically derived workspace dependency graph, or a topologically ordered package list from
  that graph. Do not add package names to CI configuration manually.
- Build `module-utils` once per job and remove package-local sibling rebuild hooks that become
  redundant.
- Verify the automatically derived graph against direct and transitive module consumers, including
  `healthcheck` and the Directus package chains. Add a fixture package/dependency in tests to prove
  future workspace dependencies are picked up without implementation changes.

### 6. Remove redundant module build work (#148)

- Measure current stub/prepare/real-build behavior for representative stub-only and real-build
  consumers.
- Remove `--stub` where real output is proven sufficient.
- Define whether prepare-generated real artifacts are reused by the later build/pack phase; if not,
  retain the later build but avoid claiming the duplicate is removed.
- Keep local `dev:prepare`/`dev` behavior working and validate from clean output directories.

### 7. Documentation, timing, and regression proof

- Add `docs/ci.md` as the end-to-end source of truth for the complete CI chain: event triggers,
  checkout/diff discovery, configurable policy, scope and phase selection, package graph expansion,
  environment loading, prepare/build ownership, artifact packing, external-consumer validation,
  merge-group behavior, required checks, failure fallbacks, and the temporary safety override.
- Update `docs/workspace.md`, `docs/actions.md`, `docs/publishing.md`, and any maintainer article
  whose existing scope references a changed CI/build contract. Keep each article's current scope;
  link to `docs/ci.md` rather than duplicating the complete chain.
- Add a short timing/computation comparison to the PR description or a durable maintainer note:
  baseline and new runs for light, focused, full, and merge-group-equivalent paths.
- Include PR #154/Varlock environment validation in the timing and regression matrix.
- Run detector unit tests plus representative clean package prepare/build/pack/consumer checks.
- Run the repository completion gates required by `AGENTS.md`.

## Validation plan

### Detector tests

Use fixture cases that assert the complete result, not only `scope`:

- docs-only, changeset-only, ignored-only → light and no packages/phases;
- package source → focused package plus transitive dependents;
- package source + README → focused, never light;
- test-only/config-only/build-config-only → expected phase subset;
- workflow/release workflow distinction;
- lockfile importer cases and conservative fallback;
- unknown path, no diff, empty diff, manual event, and unresolved merge-group base → full;
- merge-group diff equivalent to the same pull-request diff → identical classification.
- invalid policy/configuration → full validation and a clear summary error.
- `force_external_consumer_check=true` → the consumer job builds, packs, and validates fresh
  artifacts.

### Build/prepare checks

From clean generated output, use at least one module that imports `module-utils` subpaths and one
module with downstream module consumers. Verify:

- real producer output exists before dependent preparation;
- module prepare and playground prepare succeed;
- selected typechecks/tests succeed;
- packed artifacts and external consumer validation still succeed when selected;
- local `dev:prepare` and `dev` scripts remain usable.

### Repository gates

Run the exact applicable commands, recording failures rather than implying skipped checks passed:

```sh
corepack pnpm format
corepack pnpm lint:fix
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm validate:packages
```

For release-facing paths also run clean `pack:packages` and external-consumer validation. While the
temporary safety flag is enabled, verify that the external-consumer job itself builds and packs the
artifacts it consumes. Review the complete diff, ensure no generated output is included, and remove
this file before handoff.

## Resolved decisions

1. **Light validation:** Run `format:check` and `lint`, preferably without a full dependency
   install. Verify the practical runner/tooling path first.
2. **Output shape:** Use JSON for the detector result and derive a human-readable summary from it.
3. **Merge-group base:** Use a verified event/local ancestry base; fail closed to full when unsafe
   or unavailable. The diff must cover the synthetic combined commit.
4. **Lockfile classification:** Retain full validation and track importer-aware classification as a
   follow-up; do not guess in this PR.
5. **Build ownership:** Use explicit CI/root orchestration; keep package-local `dev:prepare`
   developer-friendly and do not depend on CI-only artifact reuse.
6. **Package scripts:** Normalize the common pattern now, including all proven module-utils
   consumers and their dependency ordering.
7. **Config format:** Use a repository-owned JavaScript policy module exporting a data-shaped,
   versioned contract. Validate it in detector tests and fail closed when invalid.
8. **Temporary release guardrail:** Enable `force_external_consumer_check` during the overhaul; the
   consumer job builds and packs the artifacts it validates. Disable it only after successful
   regression evidence and an explicit review of the resulting risk.
9. **Documentation:** Add `docs/ci.md` as the complete CI-chain article, with focused cross-links
   from workspace, Actions, and publishing documentation.

## Definition of done

- PR #154 is incorporated and its Varlock/Proton Pass setup remains functional.
- The policy, detector, workflow, package scripts, tests, and documentation agree on one CI
  contract.
- Light changes run only formatting/lint checks; focused and full scopes select phases explicitly.
- Merge groups remain required and are classified against their synthetic diff, with safe full
  fallback.
- `healthcheck` and the Directus dependency chains prepare in correct order without redundant
  sibling rebuilds.
- The temporary external-consumer override has exercised fresh package builds/packs during the
  overhaul, and its enabled/disabled status is explicit in the PR handoff.
- Required validation passes or is reported with exact blockers.
- `CI_OVERHAUL.md` is removed before submission; no generated output or commit is created by the
  agent.
