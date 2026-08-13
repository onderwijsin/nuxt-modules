# CI overhaul follow-up audit brief

## Purpose

Re-audit the CI overhaul after the Proton Pass CLI installation hardening change. The audit has the
same scope as the original `CI_AUDIT_BRIEF.md`: determine whether the workflows, detector, phase
policy, build orchestration, package validation, external-consumer validation, security controls,
and supporting documentation are reliable production merge and publishing guardrails.

This is a follow-up audit, not an implementation plan. Review the current repository state and
executable behavior independently; do not assume the previous audit's conclusions remain valid.

## Required follow-up focus

Verify that `.github/actions/install-proton-pass-cli/action.yml` no longer executes an unpinned
remote installer and that the replacement is operational on every supported CI platform:

- Proton Pass CLI version is explicit and intentionally maintained;
- download URLs are version-pinned rather than `latest` or manifest-resolved;
- Linux x86_64, Linux aarch64/arm64, macOS x86_64, and macOS arm64 mappings are correct;
- downloaded binaries are checked against the intended SHA-256 values before installation;
- unsupported platforms fail clearly;
- temporary files are cleaned up on success and failure;
- installation is atomic and the resulting executable is the one whose version is reported; and
- no secret values are exposed while Varlock/Proton Pass-backed playground validation runs.

Confirm that the documented CI/environment/security contracts describe the pinned installation and
its maintenance procedure. Check whether a release/version update can accidentally change the binary
without a reviewed source diff.

## Equivalent audit scope

Review and exercise the following, as applicable:

- `.github/workflows/ci.yml` and `.github/workflows/publish.yml`;
- `.github/actionlint.yaml` and all local Actions under `.github/actions/`;
- `scripts/detect-changes.mjs`, `scripts/ci-policy.mjs`, and detector tests;
- root and package preparation/build scripts changed by the overhaul;
- package metadata, tarball checks, package validation, and external-consumer validation;
- `docs/ci.md`, `docs/workspace.md`, `docs/publishing.md`, `docs/actions.md`, `docs/security.md`,
  and `docs/environment.md`;
- Varlock schemas and the Proton Pass setup introduced by PR #154; and
- interactions across pull requests, merge groups, manual dispatch, light, focused, full, and
  external-consumer paths.

Include ordinary and newly introduced workspace dependency edges, merge-group base/head handling,
failure-closed classification, artifact identity, permissions, secrets, runner labels, third-party
Actions, workflow linting, and temporary safeguards.

## Evidence expectations

Use repository state and executable behavior. Record exact commands, event assumptions, changed
paths, selected scopes/phases, package closures, artifacts, and environment limitations. Distinguish
observed failures from plausible risks.

At minimum, attempt the repository's documented release-facing checks:

```sh
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm dev:prepare
corepack pnpm build:packages
corepack pnpm validate:packages
corepack pnpm pack:packages /tmp/<unique-audit-dir>
corepack pnpm validate:external-consumer --packages-dir=/tmp/<unique-audit-dir>
```

Run actionlint or the repository's configured workflow-lint path, and validate the installer on each
available platform or explain why runner evidence is unavailable. Inspect the final diff and confirm
generated output is not included.

## Deliverable

Return the repository's read-only audit handoff with:

1. `Publish`, `Publish after fixes`, or `Do not publish yet` verdict;
2. prioritized findings using the audit skill's exact finding structure;
3. validation passed, failed, skipped, or unavailable with exact commands;
4. contracts and documentation impact;
5. conditions before enabling/disabling temporary safeguards;
6. residual risks and follow-up actions;
7. cookbook conformance;
8. README readiness;
9. consumer-skill safety/usefulness; and
10. whether the packed packages can be trusted in an unrelated production Nuxt application.
