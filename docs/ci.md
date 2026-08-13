# Continuous integration

This article is the end-to-end contract for repository CI. The focused articles remain authoritative
for their narrower concerns: [workspace tooling](workspace.md) defines commands and generated
output, [custom Actions](actions.md) defines workflow/action security, and
[publishing](publishing.md) defines release validation. Those articles link here when the complete
chain matters.

## Workflow entry points

`.github/workflows/ci.yml` runs for:

- `pull_request`, where the changed-file diff is based on the pull request base;
- `merge_group`, where the diff is based on the merge group's synthetic commit parent; and
- `workflow_dispatch`, which intentionally runs the full safety path.

Merge groups are not skipped. They validate the combined commit that the queue may merge. If the
merge-group base SHA is unavailable or its diff cannot be read, detection fails closed to full
validation.

All third-party Actions are pinned to immutable commit SHAs. The local Proton Pass action is used by
jobs that load Varlock-backed playground environments. CI sets `HUSKY=0` and uses Node 24 with the
pinned pnpm version.

## Workflow linting

Every CI run also starts an independent `workflow_lint` job. It runs actionlint against all GitHub
Actions workflows, including changes that the detector classifies as light. This keeps workflow
syntax, expressions, action inputs, dependency references, and shell snippets under validation
regardless of the selected package phase set.

## Detection and policy

The detector is [`scripts/detect-changes.mjs`](../scripts/detect-changes.mjs). Its path rules and
scope phase sets are configured in [`scripts/ci-policy.mjs`](../scripts/ci-policy.mjs). The policy
is JavaScript rather than workflow YAML so comments, tests, and small policy changes stay together.

The detector:

1. discovers workspace packages from the repository layout and package manifests;
2. obtains the base-to-head changed paths;
3. classifies the change as `light`, `focused`, or `full`;
4. adds the changed module's playground where applicable;
5. derives transitive workspace dependents and preparation dependencies automatically from every
   dependency field in every discovered manifest; and
6. emits machine-readable outputs plus a human-readable log and Actions job summary.

The machine-readable detector result is JSON-shaped and is exposed through individual GitHub Actions
outputs for job conditions. The human-readable summary is the observability and debugging surface;
it should explain the selected scope, reason, package closure, test paths, and phases.

The classifier fails closed when there is no trustworthy diff, the diff is empty, an event is not a
trusted diff event, a path is unknown, or a repository-wide path is touched. Documentation and
explicitly ignored paths are light only when no package-affecting path is present alongside them.
Lockfile changes remain full by policy.

This conservative boundary is intentional: local or otherwise ambiguous repository files also remain
full-validation triggers. More precise local-file classification and importer-aware lockfile
classification are follow-up work, not assumptions embedded in the current contract.

## Scopes and phases

The policy emits both an overall scope and enabled phases. Scopes and phases are related but
deliberately distinct:

- A **scope** is the detector's execution strategy. It determines the package inputs, dependency
  closure, preparation targets, and validation breadth available to the workflow.
- A **phase** is one executable check or artifact operation. The effective phase set determines
  which corresponding workflow steps run.

Scopes are retained as coarse, reviewable modes because a phase list alone does not describe the
package set or setup required by a run. For example, `focused` means that checks operate on an
affected package closure; it is not merely an alias for a particular list of checks. The scope is
useful for routing and safety decisions, while phases are the detailed execution contract.

Each phase is also emitted as a boolean workflow output. CI uses those outputs as the conditions for
the corresponding validation steps; the phase set is therefore executable configuration, not just a
label in the detector log. If a phase is removed from a policy set, its associated steps are
skipped. Job setup remains only where it is needed to run another enabled phase.

The temporary `force_external_consumer_check` setting is an explicit policy transformation: when
enabled, the detector adds `external_consumer` to every non-light effective phase set and emits that
fact in `phases` and `phase_external_consumer`. It is not a hidden workflow exception.

| Scope     | Execution strategy                                     | Default phases                                                                             |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `light`   | Repository checks; no package setup or package closure | format, lint                                                                               |
| `focused` | Affected package closure and its preparation inputs    | format, lint, prepare, typecheck, test                                                     |
| `full`    | Repository-wide and release-facing validation          | format, lint, prepare, typecheck, test, build, package validation, pack, external consumer |

The detector also emits the selected validation and preparation package lists. The validation list
contains directly changed packages and transitive dependents. The preparation list additionally
contains transitive workspace dependencies, so adding a new workspace dependency requires no manual
CI configuration.

## Jobs

### Detection

`detect_changes` checks out full history, runs the detector, and publishes scope, phases, package
lists, test paths, and the temporary external-consumer safety flag.

### Light validation

`light_quality_check` runs only `format:check` and `lint`. It does not prepare packages, build
artifacts, run type checks, or run tests.

### Focused validation

`focused_quality_check` installs the workspace, loads Varlock playground environments, builds
`module-utils` once, prepares the automatically derived package dependency closure in one pnpm
invocation, then runs formatting, linting, affected type checks, and selected tests.

### Full validation

`full_quality_check` loads playground environments, runs root preparation, quality checks, recursive
type checks, coverage tests, module builds, package metadata validation, and packing. It uploads the
packed artifacts for the normal external-consumer path.

### External consumer safety validation

During this CI overhaul, `force_external_consumer_check` is enabled. For every non-light successful
validation, `external_consumer_check` builds and packs fresh artifacts inside the consumer job and
validates those exact archives in a clean application. It does not install Proton Pass or run
Varlock: those are preparation concerns, while the consumer job only needs package build tooling and
the packed artifacts. This intentionally duplicates some work while build orchestration is changing
so broken packages cannot pass solely because a previous artifact was reused.

When the temporary flag is disabled, the full validation job's uploaded packed artifacts are
downloaded and checked by the consumer job as the normal optimized path. The flag must only be
disabled after the overhaul's full regression and timing evidence has been reviewed.

## Build ownership

The root scripts own shared build ordering:

- `pnpm dev:prepare` builds `module-utils` once, then prepares workspace packages;
- `pnpm build` builds `module-utils` once, then runs `build:packages`; and
- `pnpm build:packages` builds module packages without rebuilding `module-utils`.

Package `dev:prepare` scripts retain stubs because stubs generate Nuxt's local preparation files and
some exported runtime subpaths require a real module build. CI must not assume that a stub is a
publishable artifact. Generated `dist`, `.nuxt`, `.output`, coverage, and tarballs are never
committed.

## Required checks and failure behavior

Required CI status must be reported for every scope, including light changes and merge groups. A
classification or policy failure must select the full path or fail visibly; it must never silently
skip package validation. The external consumer is the final guardrail for package artifacts and is
also run immediately before publishing by `publish.yml`.

Detector behavior is covered by the focused test suite at
`scripts/__tests__/detect-changes.test.mjs`, including policy rules, all scope fallbacks, graph
closure, output files, summaries, and invalid Git diff handling.
