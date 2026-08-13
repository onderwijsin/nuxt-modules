# CI overhaul audit brief

## Purpose

Assess whether the CI overhaul on branch `ci/overhaul` is suitable for release and reliable use as
the repository's production merge and publishing guardrail.

The audit should determine whether the changed workflows, change detector, phase policy, build
orchestration, package validation, external-consumer validation, and supporting documentation behave
as intended across their supported GitHub Actions entry points.

## Background

The repository has multiple interlinked build and CI concerns: repeated package preparation and
utility builds, incomplete change classification, merge-queue behavior, dependency propagation,
package-artifact validation, and the relationship between development preparation and CI builds.

The overhaul introduces change-aware validation with light, focused, and full phase sets; automatic
workspace dependency-graph discovery; explicit root build ownership; workflow linting; dedicated CI
documentation; and a temporary forced external-consumer check intended to reduce the chance of
publishing broken packages while the new flow is being adopted.

The branch was synchronized with the then-current `main`, including the changes from PR #154, which
added Varlock-backed playground validation and Proton Pass CLI usage in CI.

## Audit goal

Provide an evidence-based release recommendation for the CI overhaul. Establish whether it:

- selects an appropriate validation scope for each supported event and change type;
- executes every selected phase reliably and in the intended order;
- detects and prepares all relevant workspace package dependencies automatically;
- produces and validates package artifacts that an unrelated external Nuxt application can consume;
- preserves the repository's security, publishing, runtime, and documentation contracts; and
- fails safely when classification, preparation, building, packaging, or external validation cannot
  be trusted.

## Scope

Review the implementation and resulting behavior of:

- `.github/workflows/ci.yml` and `.github/workflows/publish.yml`;
- `.github/actionlint.yaml` and local GitHub Actions under `.github/actions/`;
- `scripts/detect-changes.mjs`, `scripts/ci-policy.mjs`, and their tests;
- root and package build/preparation scripts changed by the overhaul;
- package artifact, package validation, and external-consumer paths used by CI and publishing;
- affected documentation, including `docs/ci.md`, workspace, publishing, and Actions guidance; and
- interactions with the Varlock and Proton Pass setup introduced by PR #154.

Consider pull requests, merge groups, and manual workflow dispatches, as well as light, focused,
full, and external-consumer phase paths. Include both ordinary workspace dependencies and newly
introduced workspace dependency edges in the review boundary.

## Not in scope

Do not expand the audit into a general review of unrelated module functionality, product behavior,
or pre-existing package issues unless the CI overhaul changes their release or validation outcome.
Do not treat unrelated warnings or failures as CI-overhaul findings without evidence of a causal
connection.

## Risk areas to evaluate

These are areas for independent assessment, not presumed defects:

- incorrect base/head selection or unsafe fallback behavior for pull requests and merge groups;
- changes being classified too narrowly or too broadly;
- dependency-graph omissions, cycles, package naming mismatches, or stale assumptions about
  workspace layout;
- phase outputs not matching the jobs that consume them, including skipped or unexpectedly required
  jobs;
- duplicate, missing, or incorrectly ordered utility, stub, real module, and playground builds;
- differences between focused validation, full validation, publishing, and local developer flows;
- package artifacts differing from those tested by the external consumer;
- the temporary forced external-consumer mode masking a failure, creating an unsafe gap, or imposing
  an unintended release dependency;
- secrets, permissions, third-party Actions, shell inputs, runner labels, or untrusted pull-request
  data introducing security or availability concerns;
- workflow linting and configuration becoming stale as workflows or runner infrastructure evolve;
- documentation describing behavior that differs from the executable CI contract; and
- the removal or retention of temporary audit/overhaul artifacts before release.

## Evidence expectations

Use the repository state and executable behavior as evidence. Distinguish observed failures from
conditions that could cause failures. Record the exact event, changed paths, selected scope and
phases, commands or workflow runs, package set, artifacts, and environment assumptions used for each
conclusion.

Where a check cannot be run because of credentials, runner infrastructure, unavailable services, or
local-environment limitations, identify it as unverified and explain the consequence for the release
recommendation.

## Reviewer deliverable

Return a concise report containing:

1. an overall release recommendation;
2. findings ordered by release impact, with evidence and affected files or behaviors;
3. validation performed and evidence unavailable;
4. any conditions that should be satisfied before enabling the overhaul or disabling its temporary
   safeguards; and
5. residual risks and suggested follow-up work.

The report should remain independent of the implementation plan. It may recommend fixes or further
evidence, but should not assume that the current architecture or phase boundaries are correct.
