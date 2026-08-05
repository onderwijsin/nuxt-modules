# Publishing

Publishing uses two manually triggered stages and is never triggered by a
push to `main`.

## Local developer workflow

When a change affects a published module, create a Changeset locally before
opening the pull request:

```sh
pnpm changeset
pnpm changeset:status
```

Select every affected publishable package, choose the appropriate SemVer
impact, and write a concise release note. Commit the generated
`.changeset/<name>.md` file with the code change. Pull request CI checks that a
Changeset is present; documentation-only or CI-only changes may use the
`no-changeset` label instead.

The local Changeset is input to the release process. Its summary remains the
curated release note; the configured `@changesets/changelog-git` generator also
appends links to the commits included in the release. Developers do not need
to run `changeset:version` or `changeset:publish` locally. Those commands run
in the manual GitHub Actions workflows after the change has been reviewed and
merged.

## Two-stage release flow

### 1. Prepare the release

Run `prepare-release.yml` manually from `main`. The workflow runs Changesets'
version command, which consumes the pending `.changeset/*.md` files, updates
the affected package versions and changelogs, and removes the consumed
changesets.

The workflow commits those changes to `release/packages` and creates or
updates a pull request targeting `main` using Git and the GitHub API. It does
not publish packages. The pull request exists so the generated version and
changelog changes can be reviewed and receive the normal pull request CI.

### 2. Publish the release

After the release pull request is merged, run `publish.yml` manually from
`main`. The workflow builds the merged packages, validates their publish
metadata and packed artefacts, reports npm publication status, and runs
Changesets publish. Changesets only publishes package versions that are part
of the release and are not already published.

When publishing succeeds, the workflow creates the package-specific Changesets
git tags and pushes them to `main`. Re-running the workflow is safe: already
published versions are reported and skipped by Changesets.

## Checks performed

The complete validation suite runs once on the release pull request through the
PR-only CI workflow. The publish workflow repeats only the checks that protect
the publish artefact itself.

| Stage    | Check                          | Purpose                                                                                                   |
| -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Every PR | Changeset policy               | Requires a changeset unless the `no-changeset` label is present.                                          |
| Every PR | Format, lint, typecheck, tests | Validates source quality and behavior.                                                                    |
| Every PR | Recursive build                | Builds shared utilities, modules, and playgrounds.                                                        |
| Every PR | Package metadata               | Checks public access, repository metadata, Node support, required files, and private dependency bundling. |
| Every PR | Packed artefact and Publint    | Inspects the actual tarball and validates npm package metadata.                                           |
| Publish  | Recursive build                | Rebuilds the merged source before publishing.                                                             |
| Publish  | Package metadata               | Confirms the package still meets the publish contract.                                                    |
| Publish  | Packed artefact and Publint    | Prevents an invalid or incomplete tarball from reaching npm.                                              |
| Publish  | npm status report              | Reports pending, already-published, and failed package versions before and after publishing.              |
| Publish  | Changesets publish and tags    | Publishes the release versions and pushes their package-specific git tags.                                |

## Commands

The repository has the Changesets CLI and Publint installed, and the root
package exposes these Changesets commands:

```sh
pnpm changeset
pnpm changeset:status
pnpm changeset:version
pnpm changeset:publish
```

The first publishable module is `@onderwijsin/nuxt-ui-form-extensions`. The
private `module-utils` and `test-utils` packages are ignored by Changesets.
The `NPM_TOKEN` GitHub secret must be configured before running the publish
workflow. The publish workflow configures npm authentication temporarily
through `actions/setup-node`; the token is never committed.
