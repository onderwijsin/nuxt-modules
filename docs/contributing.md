# Contributing

This is the repeatable workflow for adding or changing a module. Keep changes inside the package
they affect and preserve the isolated playground contract. Review the repository's
[security guide](security.md) when a change affects dependencies, workflows, or security findings.
Agents must first follow the [agent workflow and documentation router](agent-workflow.md); this
article describes the contributor-facing package workflow it selects.

## Before coding

1. Use Node.js 24 and run `corepack enable` once to activate the pinned pnpm version.
2. Install with `pnpm install --frozen-lockfile`.
3. Read the relevant package README and use the [module cookbook index](module-cookbook/index.md) to
   select every applicable maintainer article.
4. Confirm whether the change affects code, tests, maintainer docs, public documentation, the
   consumer skill, package metadata, compatibility, or a published package release.

## Package workflow

For a new module, create `modules/<module-name>` with `src/module.ts`, tests, README, changelog,
package metadata, and an isolated `playground/`. The playground must depend on the local module with
`workspace:*` and register the module by its public package name. The existing workspace globs
discover both packages automatically. Also update the external consumer fixture with safe dummy
configuration and a local sanity assertion for every new publishable module.

For a runtime utility, use `packages/module-utils` patterns and decide whether it belongs in the
published `@onderwijsin/nuxt-module-utils` package, side-effect-free, and named-export-only. For
test helpers, use `packages/test-utils`; never import test utilities from published runtime code.

## Validation workflow

Run these commands from the repository root:

```sh
pnpm format
pnpm lint:fix
pnpm typecheck
pnpm test
pnpm build
pnpm validate:packages
```

When iterating on one module, use filters without changing the root tooling:

```sh
pnpm exec vitest run modules/ui-form-extensions/__tests__
pnpm --filter @onderwijsin/nuxt-ui-form-extensions build
pnpm --filter ui-form-extensions-playground typecheck
pnpm --filter ui-form-extensions-playground build
```

CI validation is change-aware. Ordinary pull requests use `scripts/detect-changes.mjs` to select the
smallest safe package closure: documentation-only changes run formatting and linting, while package
changes run preparation, typechecking, and tests for the changed packages and their dependents.
Changes to root configuration, dependencies, scripts, workflows, shared packages, or unclassified
paths fail closed into full validation.

Merge queue and manually dispatched CI always run the full suite: formatting, linting, recursive
typechecking, coverage tests, all package builds, package metadata validation, packed-artifact
validation, and the clean external consumer check. The external consumer installs the exact packed
artifacts produced by the full validation job. Before review, inspect packed output when relevant
and confirm it contains only the intended `dist` entrypoints, declarations, documentation, and
licence. Do not commit `.nuxt`, `.output`, `dist`, coverage, or `.tgz` output.

## Changesets

Run `pnpm changeset` locally for every user-facing change, select each affected published package,
choose the SemVer impact, and commit the generated `.changeset/<name>.md` file with the change.
Check the result with `pnpm changeset:status`. Changesets also posts the proposed release impact on
the pull request. Use the `no-changeset` pull request label only for changes that do not affect a
published package. Versioning and publishing are performed by the manual release workflows after
merge.

Create one Changeset file per concern. Unrelated changes require separate entries even when they
affect the same package or have the same SemVer level, so each release note describes one coherent
consumer impact.

## Before handoff

Review the complete diff and reconcile the implementation, tests, maintainer docs, package README,
consumer skill, dependency, compatibility, and Changeset impact. Agents use the exact handoff in
[`agent-workflow.md`](agent-workflow.md); human contributors should provide the same evidence in a
pull request description.

## Pull requests

Pull requests must pass formatting, linting, type checking, tests, recursive typechecks, package
builds, package metadata validation, and packed artefact validation. They may also receive CodeQL
findings and Dependabot security-update changes; handle those through the
[security guide](security.md) and the normal review process. Changesets reports release impact in a
pull request comment. Releases are never published by pull request or push CI.
