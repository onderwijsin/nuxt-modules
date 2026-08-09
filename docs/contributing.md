# Contributing

This is the repeatable workflow for adding or changing a module. Keep changes inside the package
they affect and preserve the isolated playground contract. Review the repository's
[security guide](security.md) when a change affects dependencies, workflows, or security findings.

## Before coding

1. Use Node.js 24 and run `corepack enable` once to activate the pinned pnpm version.
2. Install with `pnpm install --frozen-lockfile`.
3. Read the relevant package README and the [module cookbook](module-cookbook/package-anatomy.md).
4. Confirm whether the change affects a published package and therefore needs a Changeset.

## Package workflow

For a new module, create `modules/<module-name>` with `src/module.ts`, tests, README, changelog,
package metadata, and an isolated `playground/`. The playground must depend on the local module with
`workspace:*` and register the module by its public package name. The existing workspace globs
discover both packages automatically.

For a runtime utility, use `packages/module-utils` patterns and decide whether it belongs in the
published `@onderwijsin/nuxt-module-utils` package, side-effect-free, and named-export-only. For
test helpers, use `packages/test-utils`; never import test utilities from published runtime code.

## Validation workflow

Run these commands from the repository root:

```sh
pnpm fmt
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

CI also runs `pack` and Publint against every non-private package. Before review, inspect the
resulting tarball and confirm it contains only the intended `dist` entrypoints, declarations,
documentation, and licence. Do not commit `.nuxt`, `.output`, `dist`, coverage, or `.tgz` output.

## Changesets

Run `pnpm changeset` locally for every user-facing change, select each affected published package,
choose the SemVer impact, and commit the generated `.changeset/<name>.md` file with the change.
Check the result with `pnpm changeset:status`. Changesets also posts the proposed release impact on
the pull request. Use the `no-changeset` pull request label only for changes that do not affect a
published package. Versioning and publishing are performed by the manual release workflows after
merge.

## Pull requests

Pull requests must pass formatting, linting, type checking, tests, recursive builds, playground
checks, package metadata validation, and packed artefact validation. They may also receive CodeQL
findings and Dependabot security-update changes; handle those through the
[security guide](security.md) and the normal review process. Changesets reports release impact in a
pull request comment. Releases are never published by pull request or push CI.
