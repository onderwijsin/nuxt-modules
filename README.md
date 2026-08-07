![Stichting Onderwijs in](https://raw.githubusercontent.com/onderwijsin/.github/main/banner.png)

# Nuxt Modules

This repository is a collection of standalone Nuxt 4 modules maintained by _Onderwijs in_. The
modules are opinionated building blocks for use in internal _Onderwijs in_ projects.

## 📦 What's in the box?

| Package                                | Description                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `@onderwijsin/nuxt-static-text`        | Type-safe static text tokens for Nuxt applications. Compatible with Vue i18n syntax.           |
| `@onderwijsin/nuxt-ui-form-extensions` | Nuxt UI form extensions for keeping editable drafts separate from canonical application state. |
| `@onderwijsin/nuxt-loops-renderer`     | Nuxt module for rendering Loops parsed LMX email content.                                      |
| `@onderwijsin/nuxt-theme-customizer`   | Runtime theme picker and custom color editor for Nuxt UI.                                      |
| `@onderwijsin/nuxt-device`             | SSR-aware device, browser, operating-system, and crawler detection.                            |
| `@onderwijsin/nuxt-webmanifest`        | Zero-config rich web app manifest generation with Cloudinary and IPX icons.                    |

## 🧱 Requirements

- Node.js 24 for local development and CI.
- Node.js 22 or newer for published modules.
- pnpm 11.13.1 through Corepack.
- gitleaks v8.x

Run `corepack enable` once to activate the pinned pnpm version, then install the workspace
dependencies:

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
npx skills add onderwijsin/nuxt-modules --skill "<module-name>"
# npx skills add onderwijsin/nuxt-modules --skill nuxt-loops-renderer
```

These skills provide module-specific guidance, API references, examples, and troubleshooting for
agents working in consuming Nuxt applications.

## 🚀 Getting Started

Build all workspace packages and isolated playgrounds with:

```sh
pnpm build
```

Run the module playground during development:

```sh
pnpm --filter @onderwijsin/nuxt-loops-renderer dev
```

Run playground checks directly when iterating:

```sh
pnpm --filter loops-renderer-playground typecheck
pnpm --filter loops-renderer-playground build
```

Each module owns an isolated playground. A shared integration playground will only be introduced
when multiple modules have a supported interaction that needs to be validated together.

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

For read-only checks, use `pnpm format:check` and `pnpm lint`. CI additionally packs each
publishable module, checks the tarball for private workspace leakage, and runs Publint. The package
tarball is the source of truth for release validation.

## 🤖 Module implementation prompt

Use this prompt when asking an agent to create, migrate, or update a module:

```text
Use the `authoring-nuxt-modules` skill for this task.
Start with `docs/module-cookbook/package-anatomy.md` and follow only the relevant articles linked
in its Further Reading section. Treat those resources and nearby module implementations as the
source of truth; do not recreate their guidance here.

Inspect the affected module and a comparable module before changing code. Keep the implementation
scoped, preserve existing contracts unless the request says otherwise, and update the matching
consumer documentation when the public API changes.

Run the relevant validation from `docs/workspace.md`. Do not commit changes or generated output.

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

- [`docs/module-cookbook/package-anatomy.md`](docs/module-cookbook/package-anatomy.md) —
  authoritative module cookbook.
- [`docs/contributing.md`](docs/contributing.md) — contributor workflow.
- [`docs/workspace.md`](docs/workspace.md) — workspace, tools, and commands.
- [`docs/publishing.md`](docs/publishing.md) — release checks and publishing.

## 🚢 Publishing

For every user-facing module change, create and commit a Changeset locally:

```sh
pnpm changeset
pnpm changeset:status
```

Select the affected package, choose the SemVer impact, and write the release note. Changesets posts
the proposed release impact on the pull request; documentation-only and CI-only changes may use the
`no-changeset` label. Developers do not need to version or publish locally.

After review and merge, publishing is a manual two-stage flow from `main`. **Prepare release**
consumes the Changesets, versions affected packages, updates changelogs, appends links to the
included commits, and opens or updates a release pull request without publishing. After that pull
request is merged, **Publish release** rebuilds and validates the packages, publishes through
Changesets, and creates package-specific tags and GitHub Releases.

The `NPM_TOKEN` GitHub secret is required for publishing and is never stored in the repository. See
[`docs/publishing.md`](docs/publishing.md) for the complete release procedure and rerun behavior.

## 📄 License

MIT. See [`LICENSE`](LICENSE).
