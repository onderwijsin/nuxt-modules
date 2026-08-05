# Publishing

Publishing uses a prepared release pull request and runs automatically when
that pull request is merged to `main`. The publish workflow remains manually
dispatchable for recovery or re-runs.

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
changelog changes can be reviewed and receive the normal pull request CI. It
is labeled `automated` and `no-changeset` because it contains generated
release changes rather than a new contributor changeset.

### 2. Publish the release

After the `release/packages` pull request is merged to `main`, `publish.yml`
runs automatically. It builds the merged packages, validates their publish
metadata and packed artefacts, reports npm publication status, and runs
Changesets publish. Changesets only publishes package versions that are part
of the release and are not already published.

When publishing succeeds, the workflow creates the package-specific Changesets
git tags, pushes them to `main`, and creates a GitHub Release for each tag.
Re-running the workflow is safe: already published versions and existing
GitHub Releases are skipped.

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
| Publish  | Utility and Nuxt preparation   | Builds shared utility declarations and generates the Nuxt configuration required by module builds.        |
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
The `NPM_TOKEN` and `APP_PRIVATE_KEY` GitHub secrets, plus the
`APP_CLIENT_ID` repository or organization variable, must be configured for
the release workflows. The release GitHub App token is used for release
branch, pull request, and tag pushes so protected `main` can only be bypassed
by the release app. The publish workflow configures npm authentication
temporarily through `actions/setup-node`; neither token is committed.

GitHub Actions sets `HUSKY=0` for CI, release preparation, and publishing, so
dependency installation does not enable Husky hooks and automated commits do
not run local-only checks.
