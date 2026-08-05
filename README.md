![Stichting Onderwijs in](https://raw.githubusercontent.com/onderwijsin/.github/main/banner.png)

# Nuxt Modules

This repository is a collection of standalone Nuxt 4 modules maintained by
_Onderwijs in_. The modules are opinionated building blocks for
use in internal _Onderwijs in_ projects.

## 📦 What's in the box?

| Package                                | Description                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `@onderwijsin/nuxt-static-text`        | Type-safe static text tokens for Nuxt applications. Compatible with Vue i18n syntax.           |
| `@onderwijsin/nuxt-ui-form-extensions` | Nuxt UI form extensions for keeping editable drafts separate from canonical application state. |
| `@onderwijsin/nuxt-loops-renderer`     | Nuxt module for rendering Loops parsed LMX email content.                                      |

## 🧱 Requirements

- Node.js 24 for local development and CI.
- Node.js 22 or newer for published modules.
- pnpm 11.13.1 through Corepack.
- gitleaks v8.x

Run `corepack enable` once to activate the pinned pnpm version, then install
the workspace dependencies:

```sh
corepack enable
pnpm install --frozen-lockfile
```

## 🤖 Module skills

Install the consumer-facing agent skills for these modules with:

```sh
npx skills add onderwijsin/nuxt-modules
```

To install only one skill, pass its name:

```sh
npx skills add onderwijsin/nuxt-modules --skill nuxt-loops-renderer
npx skills add onderwijsin/nuxt-modules --skill nuxt-ui-form-extensions
npx skills add onderwijsin/nuxt-modules --skill nuxt-static-text
```

These skills provide module-specific guidance, API references, examples, and
troubleshooting for agents working in consuming Nuxt applications.

## 🚀 Getting Started

Build all workspace packages and isolated playgrounds with:

```sh
pnpm build
```

Run the module playground during development:

```sh
pnpm --filter @onderwijsin/nuxt-ui-form-extensions dev:playground
pnpm --filter @onderwijsin/nuxt-static-text dev:playground
```

Run playground checks directly when iterating:

```sh
pnpm --filter ui-form-extensions-playground typecheck
pnpm --filter ui-form-extensions-playground build
```

Each module owns an isolated playground. A shared integration playground will
only be introduced when multiple modules have a supported interaction that
needs to be validated together.

## ✅ Validation

Apply formatting and lint fixes, then run the complete local validation suite:

```sh
pnpm format
pnpm lint:fix
pnpm typecheck
pnpm test
pnpm build
pnpm validate:packages
```

For read-only checks, use `pnpm format:check` and `pnpm lint`. CI additionally
packs each publishable module, checks the tarball for private workspace
leakage, and runs Publint. The package tarball is the source of truth for
release validation.

## 🤖 Module implementation prompt

The authoritative implementation guidance is
[`docs/module-cookbook.md`](docs/module-cookbook.md). Use this prompt when
asking an agent to create or update a module:

```text
Read docs/module-cookbook.md and follow it as the authoritative guide for
module layout, metadata, Nuxt registration, runtime code, shared utilities,
playgrounds, tests, documentation, and validation. Create or update the
module requested below using the repository's existing conventions. Inspect
nearby implementations before introducing patterns, keep the change scoped,
preserve compatibility unless explicitly asked otherwise, and run the
relevant validation commands from the cookbook.

Module request:
<describe the module or change here>
```

## 🧰 Private Packages

This project contains various private packages as internal dependencies.

| Package        | Description                                                       |
| -------------- | ----------------------------------------------------------------- |
| `module-utils` | Private, shared runtime utilities bundled into consuming modules. |
| `test-utils`   | Private, test-only workspace utilities.                           |

## 📚 Documentation

- [`docs/module-cookbook.md`](docs/module-cookbook.md) — authoritative module
  implementation patterns.
- [`docs/contributing.md`](docs/contributing.md) — contributor workflow.
- [`docs/tooling.md`](docs/tooling.md) — repository tools and commands.
- [`docs/publishing.md`](docs/publishing.md) — release checks and publishing.

## 🚢 Publishing

For every user-facing module change, create and commit a Changeset locally:

```sh
pnpm changeset
pnpm changeset:status
```

Select the affected package, choose the SemVer impact, and write the release
note. Pull request CI checks for this file; documentation-only and CI-only
changes may use the `no-changeset` label. Developers do not need to version or
publish locally.

After review and merge, publishing is a manual two-stage flow from `main`.
**Prepare release** consumes the Changesets, versions affected packages,
updates changelogs, appends links to the included commits, and opens or updates
a release pull request without publishing. After that pull request is merged,
**Publish release** rebuilds and validates the packages, publishes through
Changesets, reports npm status, and pushes package-specific tags.

The `NPM_TOKEN` GitHub secret is required for publishing and is never stored
in the repository. See [`docs/publishing.md`](docs/publishing.md) for the
complete release procedure and rerun behavior.

## 📄 License

MIT. See [`LICENSE`](LICENSE).
