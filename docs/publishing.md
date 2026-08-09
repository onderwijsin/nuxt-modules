# Publishing

Publishing uses a manually prepared version pull request and runs automatically when that pull
request is merged to `main`. The publish workflow remains manually dispatchable for recovery or
re-runs.

## Local developer workflow

When a change affects a published module, create a Changeset locally before opening the pull
request:

```sh
pnpm changeset
pnpm changeset:status
```

Select every affected publishable package, choose the appropriate SemVer impact, and write a concise
release note. Commit the generated `.changeset/<name>.md` file with the code change. Changesets
posts a status comment on the pull request showing the release impact. Documentation-only or CI-only
changes may use the `no-changeset` label instead.

The local Changeset is input to the release process. Its summary remains the curated release note;
the configured `@changesets/changelog-git` generator also appends links to the commits included in
the release. Developers do not need to run `changeset:version` or `changeset:publish` locally. The
GitHub Actions workflow runs them after the change has been reviewed and merged.

## Release flow

### 1. Prepare the release

When you are ready to release, run `prepare-release.yml` manually from `main`. The workflow runs
Changesets' version command, which consumes every pending `.changeset/*.md` file, updates the
affected package versions and changelogs, and removes the consumed changesets.

The official action commits those changes and creates or updates a pull request titled
`Publish new package versions`. It does not publish packages. The pull request is labeled
`automated` and `no-changeset`, because it contains generated release changes rather than a new
contributor Changeset. It can therefore be reviewed and receive normal pull request CI without
requiring another Changeset.

### 2. Publish the release

After the `changeset-release/main` pull request is merged to `main`, `publish.yml` runs
automatically. It builds the merged packages, validates their publish metadata and packed artefacts,
validates those exact packed artefacts in the external Nuxt consumer, and then runs Changesets
publish. Changesets only publishes package versions that are part of the release and are not already
published. The Changesets publish flow itself is unchanged.

When publishing succeeds, the action creates the package-specific Changesets git tags and a GitHub
Release for each tag. Re-running the workflow is safe: already published versions and existing
GitHub Releases are skipped. The published package list is then passed to the local reusable Slack
notification workflow, which posts one Block Kit message containing a link to each GitHub Release.

The notification action accepts the native Changesets `publishedPackages` shape
(`{ name, version }`) and also supports the legacy string-array and structured `{ tag, githubURL }`
formats. It is kept dependency-free and runs directly from
`.github/actions/slack-notification/index.js`; no compiled `dist` directory is required. Configure
the `ONDERWIJSIN_SLACK_APP_OAUTH_TOKEN` and `SLACK_DEPLOYMENTS_CHANNEL_ID` repository or
organization secrets to enable the notification. The release workflow maps the OAuth token secret to
the reusable workflow's `SLACK_BOT_TOKEN` input. The workflow sends the generated payload with Slack
GitHub Action `v4.0.0` using the `chat.postMessage` API method; the channel ID is included in the
payload and the bot token is passed through the action's `token` input.

## Checks performed

The complete validation suite runs once on the release pull request through the PR-only CI workflow.
The publish workflow repeats only the checks that protect the publish artefact itself.

| Stage    | Check                           | Purpose                                                                                                       |
| -------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Every PR | Changeset status                | Posts the proposed package releases and highlights a missing Changeset without blocking the PR.               |
| Every PR | Format, lint, typecheck, tests  | Validates source quality and behavior.                                                                        |
| Every PR | Recursive build                 | Builds shared utilities and modules; recursive typecheck covers playground packages.                          |
| Every PR | Package metadata                | Checks public access, repository metadata, Node support, required files, and private dependency bundling.     |
| Every PR | Packed artefact and Publint     | Inspects the actual tarball and validates npm package metadata.                                               |
| Publish  | Utility and Nuxt preparation    | Builds shared utility declarations and generates the Nuxt configuration required by module builds.            |
| Publish  | Recursive build                 | Rebuilds shared utilities and modules before publishing.                                                      |
| Publish  | Package metadata                | Confirms the package still meets the publish contract.                                                        |
| Publish  | Packed artefact and Publint     | Prevents an invalid or incomplete tarball from reaching npm.                                                  |
| Publish  | External Nuxt consumer          | Installs the packed artefacts outside the workspace and validates prepare, build, Nitro startup, and runtime. |
| Publish  | Changesets publish and releases | Publishes release versions, creates package-specific tags, and creates GitHub Releases.                       |

## Commands

The repository has the Changesets CLI and Publint installed, and the root package exposes these
Changesets commands:

```sh
pnpm changeset
pnpm changeset:status
pnpm changeset:version
pnpm changeset:publish
```

The publishable packages include `@onderwijsin/nuxt-module-utils` and the modules under `modules/`.
Only the private `test-utils` package is ignored by Changesets. The `NPM_TOKEN`, `RELEASE_APP_ID`,
and `RELEASE_APP_PRIVATE_KEY` GitHub secrets must be configured for the release workflow. The
generated release GitHub App token is passed directly to the Changesets action for version pull
requests, tags, and GitHub Releases. The action configures npm authentication temporarily; neither
token is committed.

GitHub Actions sets `HUSKY=0` for CI and publishing, so dependency installation does not enable
Husky hooks and automated commits do not run local-only checks.
