![Stichting Onderwijs in](https://raw.githubusercontent.com/onderwijsin/.github/main/banner.png)

# Nuxt Modules

This repository is a collection of standalone Nuxt 4 modules maintained by _Onderwijs in_. The
modules are opinionated building blocks for use in internal _Onderwijs in_ projects.

## 📦 What's in the box?

| Package                                                                          | Description                                                                                    |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [`@onderwijsin/nuxt-static-text`](modules/static-text/README.md)                 | Type-safe static text tokens with a Vue I18n-like `$t` API.                                    |
| [`@onderwijsin/nuxt-ui-form-extensions`](modules/ui-form-extensions/README.md)   | Nuxt UI form extensions for keeping editable drafts separate from canonical application state. |
| [`@onderwijsin/nuxt-loops-renderer`](modules/loops-renderer/README.md)           | Nuxt module for rendering Loops parsed LMX email content.                                      |
| [`@onderwijsin/nuxt-theme-customizer`](modules/theme-customizer/README.md)       | Runtime theme picker and custom color editor for Nuxt UI.                                      |
| [`@onderwijsin/nuxt-device`](modules/device/README.md)                           | SSR-aware device, browser, operating-system, and crawler detection.                            |
| [`@onderwijsin/nuxt-webmanifest`](modules/webmanifest/README.md)                 | Zero-config rich web app manifest generation with Cloudinary and IPX icons.                    |
| [`@onderwijsin/nuxt-healthcheck`](modules/healthcheck/README.md)                 | Configurable system health endpoints with built-in and custom server-side checks.              |
| [`@onderwijsin/nuxt-turnstile`](modules/turnstile/README.md)                     | Cloudflare Turnstile integration with client helpers and action-aware server validation.       |
| [`@onderwijsin/nuxt-newsletter-signup`](modules/newsletter-signup/README.md)     | Provider-independent newsletter signup with Loops and Mailchimp adapters.                      |
| [`@onderwijsin/nuxt-simple-rate-limiter`](modules/simple-rate-limiter/README.md) | Path-scoped, per-IP server-side rate limiting for Nuxt endpoints.                              |
| [`@onderwijsin/nuxt-storage-admin`](modules/storage-admin/README.md)             | Admin-protected CRUD endpoints for Nitro storage mounts.                                       |
| [`@onderwijsin/nuxt-cache`](modules/cache/README.md)                             | Cache metadata indexing and protected base-scoped invalidation for Nitro storage.              |
| [`@onderwijsin/nuxt-redirects`](modules/redirects/README.md)                     | Provider-agnostic dynamic redirects backed by a Nitro storage index.                           |

## 🧱 Requirements

- Node.js 24 for local development and CI.
- Node.js 22 or newer for published modules.
- The workspace is developed and tested against Nuxt 4.5.x. Other Nuxt 4 versions permitted by
  individual package metadata may work, but versions outside the CI matrix are not continuously
  tested; Nuxt 3 is not guaranteed.
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

Each module contains an isolated playground for development. To run a specific playground, first
start development mode for the internal utils package, then for the module itself:

```sh
pnpm dev:utils
pnpm --filter "<package>" dev
# pnpm --filter @onderwijsin/nuxt-loops-renderer dev
```

To build the shared utility and module packages (playground build scripts are not part of the root
`build` filter):

```sh
pnpm build:utils
pnpm dev:prepare
pnpm build
```

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

## 🧰 Supporting Packages

This project contains supporting workspace packages with different publication policies.

| Package                          | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `@onderwijsin/nuxt-module-utils` | Published shared module and runtime utilities. |
| `test-utils`                     | Private, test-only workspace utilities.        |

## 📚 Documentation

- [`docs/module-cookbook/package-anatomy.md`](docs/module-cookbook/package-anatomy.md) —
  authoritative module cookbook.
- [`docs/contributing.md`](docs/contributing.md) — contributor workflow.
- [`docs/security.md`](docs/security.md) — Dependabot, CodeQL, and GitHub Actions security
  expectations.
- [`docs/workspace.md`](docs/workspace.md) — workspace, tools, and commands.
- [`docs/testing.md`](docs/testing.md) — Vitest implementation and patterns.
- [`docs/publishing.md`](docs/publishing.md) — release checks and publishing.
- [`docs/actions.md`](docs/actions.md) — Guidelines for writing custom actions.

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
