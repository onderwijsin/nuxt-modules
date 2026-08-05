# Nuxt Module Monorepo Specification

## 1. Goal

Create a public pnpm monorepo for developing, testing, versioning, and publishing multiple Nuxt 4 modules.

Published packages shall follow this naming convention:

```text
@onderwijsin/nuxt-<module-name>
```

Example:

```text
@onderwijsin/nuxt-directus
@onderwijsin/nuxt-turnstile
```

Each package shall be independently versioned and published as a public npm package.

---

## 2. Core decisions

| Concern                          | Decision                                                  |
| -------------------------------- | --------------------------------------------------------- |
| Package manager                  | pnpm                                                      |
| Repository visibility            | Public                                                    |
| Package visibility               | Public                                                    |
| Package scope                    | `@onderwijsin/nuxt-*`                                     |
| Module compatibility             | Nuxt 4                                                    |
| Consumer Node.js support         | Node.js 22 or newer                                       |
| Development and CI Node.js       | Node.js 24                                                |
| Module format                    | Native ESM                                                |
| Versioning                       | Independent versions                                      |
| Version and changelog management | Changesets                                                |
| Commit convention                | Conventional Commits                                      |
| Merge strategy                   | Squash merge                                              |
| Formatting                       | Oxfmt                                                     |
| Linting                          | Oxlint                                                    |
| Testing                          | Vitest and `@nuxt/test-utils`                             |
| Licence                          | MIT                                                       |
| Release flow                     | Two manually triggered GitHub Actions workflows           |
| Playground strategy              | One isolated playground per module                        |
| Shared runtime utilities         | Private workspace package, bundled into consuming modules |

Nothing shall be versioned or published automatically on pushes to `main`.

---

## 3. Repository structure

```text
.
├── .changeset/
│   └── config.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── prepare-release.yml
│       └── publish.yml
├── packages/
│   ├── module-utils/
│   └── test-utils/
├── modules/
│   ├── nuxt-module-a/
│   │   ├── playground/
│   │   ├── src/
│   │   │   ├── module.ts
│   │   │   └── runtime/
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   ├── e2e/
│   │   │   └── fixtures/
│   │   ├── CHANGELOG.md
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── nuxt-module-b/
│   │   └── ...
├── playgrounds/
│   └── integration/
├── scripts/
│   ├── check-packed-package.ts
│   └── validate-packages.ts
├── .nvmrc
├── .oxfmtrc.json
├── commitlint.config.ts
├── LICENSE
├── oxlint.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
└── vitest.config.ts
```

The root `pnpm-workspace.yaml` shall include:

```yaml
packages:
  - packages/*
  - modules/*
  - modules/*/playground
  - playgrounds/*
```

The optional integration playground shall only be introduced when multiple modules are expected to be installed together.

---

## 4. Root package

The root package shall be private and pin the package manager:

```json
{
  "name": "@onderwijsin/nuxt-modules",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "packageManager": "pnpm@<exact-version>"
}
```

The repository shall contain an `.nvmrc` file:

```text
24
```

Node.js 24 shall be used locally and in GitHub Actions.

Published packages shall support Node.js 22 and newer.

---

## 5. Package requirements

Every published module shall:

- use `@nuxt/module-builder`;
- use native ESM;
- support Nuxt 4;
- support Node.js 22 and newer;
- have an independent SemVer version;
- include its own README;
- include its own `CHANGELOG.md`;
- explicitly publish as a public scoped package;
- publish only intended build output;
- expose generated TypeScript declarations;
- declare complete npm repository metadata;
- use the repository MIT licence.

Example package metadata:

```json
{
  "name": "@onderwijsin/nuxt-example",
  "version": "0.1.0",
  "description": "Example Nuxt module",
  "type": "module",
  "license": "MIT",
  "engines": {
    "node": ">=22"
  },
  "files": ["dist"],
  "main": "./dist/module.mjs",
  "types": "./dist/types.d.mts",
  "exports": {
    ".": {
      "types": "./dist/types.d.mts",
      "import": "./dist/module.mjs"
    }
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/onderwijsin/<repository>.git",
    "directory": "modules/nuxt-example"
  }
}
```

Module metadata shall declare Nuxt compatibility:

```ts
import { defineNuxtModule } from "@nuxt/kit";

/**
 * Provides the example Nuxt module.
 */
export default defineNuxtModule({
  meta: {
    name: "@onderwijsin/nuxt-example",
    compatibility: {
      nuxt: "^4.0.0"
    }
  }
});
```

Packages shall use `workspace:` references for local workspace dependencies.

---

## 6. Shared workspace utilities

Shared utilities shall be split into two private packages:

```text
@repo/module-utils
@repo/test-utils
```

### 6.1 Runtime utilities

`@repo/module-utils` may contain runtime or module setup code shared by multiple published packages.

It shall:

- be marked private;
- expose side-effect-free ESM functions;
- use named exports;
- contain no Nuxt module-specific registration;
- be bundled into each consuming published module;
- never remain as an external dependency in a published package.

Example:

```json
{
  "name": "@repo/module-utils",
  "private": true,
  "type": "module",
  "sideEffects": false
}
```

Tree-shaking alone shall not be relied upon to make packages self-contained.

The package build configuration must explicitly inline or bundle imported runtime utilities.

### 6.2 Test utilities

`@repo/test-utils` may contain:

- fixture builders;
- shared Vitest helpers;
- test assertions;
- package inspection utilities;
- repository scripts.

It shall never be imported by published runtime code.

### 6.3 Leakage validation

CI shall fail when a packed package:

- imports from `@repo/*`;
- declares an `@repo/*` production dependency;
- references a private workspace package in emitted declarations;
- contains internal test utilities.

The packed npm tarball is the source of truth for this validation.

---

## 7. Playground strategy

Every module shall contain its own isolated playground:

```text
modules/nuxt-example/playground
```

The playground shall:

- be marked private;
- install the module through `workspace:*`;
- import the module through its public package name;
- not import directly from the module's `src` directory;
- contain realistic example configuration;
- support development, type checking, and production builds;
- install only dependencies genuinely required by that module.

Example:

```json
{
  "name": "@repo/playground-nuxt-example",
  "private": true,
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "typecheck": "nuxt typecheck"
  },
  "devDependencies": {
    "@onderwijsin/nuxt-example": "workspace:*",
    "nuxt": "^4.0.0"
  }
}
```

An isolated playground prevents one module from accidentally relying on another module's dependencies or configuration.

### Integration playground

An optional integration playground may exist at:

```text
playgrounds/integration
```

It shall only be used for validating combinations of modules that are expected to work together.

It shall not replace isolated module playgrounds.

### Playgrounds versus fixtures

Playgrounds are maintained applications for interactive development.

Test fixtures are small, deterministic applications used by automated tests.

Both shall be used where appropriate.

---

## 8. Formatting

Oxfmt shall be the only repository formatter.

Required scripts:

```json
{
  "format": "oxfmt --write .",
  "format:check": "oxfmt --check ."
}
```

Oxfmt shall cover:

- TypeScript;
- JavaScript;
- Vue files;
- JSON and JSONC;
- YAML;
- Markdown;
- CSS.

Generated output shall be ignored, including:

```text
.nuxt
.output
dist
coverage
*.tgz
```

Formatting shall be checked in CI.

---

## 9. Linting

Oxlint shall be the primary repository linter.

Required scripts:

```json
{
  "lint": "oxlint --deny-warnings .",
  "lint:fix": "oxlint --fix ."
}
```

The configuration shall enable relevant rules for:

- TypeScript;
- imports;
- Node.js;
- Vitest;
- JSDoc;
- Vue.

CI shall fail on warnings.

A narrowly scoped ESLint setup may be retained only for Vue template rules that Oxlint cannot enforce adequately.

ESLint shall not duplicate general TypeScript or JavaScript linting already handled by Oxlint.

---

## 10. Type checking

Type checking shall cover:

- module source;
- runtime source;
- shared runtime utilities;
- generated declarations;
- module playgrounds;
- test fixtures where useful.

Packages shall use the appropriate command:

```text
tsc --noEmit
vue-tsc --noEmit
nuxt typecheck
```

The root command shall recursively run package-level type checks:

```json
{
  "typecheck": "pnpm --recursive typecheck"
}
```

Every playground shall run:

```bash
nuxt typecheck
```

in CI.

Source-level type checking is insufficient on its own. The generated package declarations must also be tested from a packed package.

---

## 11. Testing

### 11.1 Unit tests

Vitest shall be used for:

- pure utility functions;
- module option normalisation;
- configuration merging;
- schemas;
- path and URL handling;
- runtime helpers;
- behaviour that does not require a running Nuxt application.

The root Vitest configuration shall use Vitest projects to include package-level configurations.

Required scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### 11.2 Nuxt integration tests

Modules shall use `@nuxt/test-utils` for Nuxt integration and end-to-end testing.

Fixtures should be created based on actual module behaviour and may include:

```text
test/fixtures/basic
test/fixtures/disabled
test/fixtures/custom-options
test/fixtures/ssr
test/fixtures/static
```

Tests shall verify observable behaviour rather than private implementation details.

### 11.3 Playground validation

Every module playground shall be type-checked and built in CI:

```bash
nuxt typecheck
nuxt build
```

Running every playground in a browser-level E2E suite is not required by default.

### 11.4 Package artefact testing

Every publishable package shall be packed before release.

The package validation process shall:

1. build the package;
2. run `pnpm pack`;
3. inspect the tarball contents;
4. run Publint;
5. run Are the Types Wrong;
6. check for private workspace references;
7. install the tarball into a clean Nuxt fixture;
8. run `nuxt typecheck`;
9. run `nuxt build`.

The packed tarball, not the workspace source directory, is the actual product.

---

## 12. Conventional Commits

The repository shall use Conventional Commits.

Allowed types:

```text
feat
fix
perf
refactor
docs
test
build
ci
chore
revert
```

Scopes should identify a package or repository concern:

```text
feat(directus): add configurable collection caching
fix(turnstile): preserve server validation errors
test(module-utils): cover malformed URLs
ci(release): validate package tarballs
```

Pull requests shall be squash merged.

The pull request title becomes the final commit message and shall therefore follow Conventional Commits.

Commitlint shall validate pull request titles in CI.

Intermediate commits within the pull request do not need to follow Conventional Commits because they will not be retained on `main`.

The repository shall configure GitHub to use squash merging and disable merge commits and rebase merging unless there is a later reason to support them.

---

## 13. Changesets

Changesets shall manage:

- affected package selection;
- independent package versions;
- patch, minor, and major bump intent;
- package-scoped changelogs;
- internal dependency version updates;
- npm publication detection.

Example configuration:

```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@repo/module-utils", "@repo/test-utils"]
}
```

Every user-facing package change shall include a changeset.

A changeset may be omitted for:

- tests without behaviour changes;
- documentation-only changes;
- repository tooling;
- CI changes;
- refactors with no observable package impact;
- private package changes that do not affect published output.

CI shall require either:

- at least one changeset; or
- an explicit `no-changeset` pull request label.

Each published package shall maintain its own:

```text
packages/<package>/CHANGELOG.md
```

No root aggregate changelog is required.

---

## 14. Release process

The release process shall consist of two separately triggered GitHub Actions workflows.

Neither workflow shall run automatically after a push or merge to `main`.

### 14.1 Prepare release workflow

File:

```text
.github/workflows/prepare-release.yml
```

Trigger:

```yaml
on:
  workflow_dispatch:
```

The workflow shall:

1. require `main` as the source branch;
2. check out the full repository history;
3. use Node.js 24;
4. install the pinned pnpm version;
5. install dependencies with a frozen lockfile;
6. run the complete validation suite;
7. run `pnpm changeset version`;
8. update package versions;
9. update package changelogs;
10. update internal package dependency ranges;
11. create or update a release branch;
12. commit the generated changes;
13. open a release pull request.

Suggested branch:

```text
release/packages
```

Suggested release commit and PR title:

```text
chore(release): version packages
```

The workflow shall not publish anything to npm.

The release pull request shall be reviewed and squash merged normally.

### 14.2 Publish workflow

File:

```text
.github/workflows/publish.yml
```

Trigger:

```yaml
on:
  workflow_dispatch:
    inputs:
      dist-tag:
        description: npm distribution tag
        required: true
        default: latest
        type: choice
        options:
          - latest
          - next
```

The workflow shall:

1. refuse to publish from anything other than `main`;
2. check out the full repository history;
3. use Node.js 24;
4. install the pinned pnpm version;
5. install dependencies with a frozen lockfile;
6. rerun release-critical validation;
7. build publishable packages;
8. pack and inspect publishable packages;
9. run `pnpm changeset publish`;
10. push package-specific Git tags;
11. optionally create package-specific GitHub Releases.

Package tags shall use unambiguous names:

```text
@onderwijsin/nuxt-example@1.2.0
@onderwijsin/nuxt-other@0.4.1
```

The workflow shall be safely rerunnable.

Packages whose current version already exists on npm shall be skipped rather than causing the entire retry to fail.

Publishing multiple packages is not atomic. The workflow output must clearly report which packages:

- were already published;
- were published successfully;
- failed to publish.

Published npm versions shall never be overwritten.

---

## 15. npm authentication

The initial implementation shall use an npm token stored as a GitHub Actions secret.

The expected secret name shall be:

```text
NPM_TOKEN
```

Before implementation, verify that the existing token:

- still exists;
- has not expired;
- belongs to the correct npm account;
- can publish packages under `@onderwijsin`;
- is permitted to publish without interactive 2FA;
- has the minimum required package permissions.

The publish workflow shall expose it as:

```yaml
env:
  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

The repository shall include a project-level `.npmrc`:

```text
//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}
access=public
```

No actual token shall be committed.

### Future migration

Migrating to npm trusted publishing through GitHub OIDC is recommended once the packages have been created.

That migration is not required for the initial implementation.

---

## 16. CI workflow

File:

```text
.github/workflows/ci.yml
```

Triggers:

```yaml
on:
  pull_request:
  push:
    branches:
      - main
```

CI shall never version or publish packages.

Required checks:

1. validate the pull request title with Commitlint;
2. validate changeset presence or exemption;
3. install dependencies with a frozen lockfile;
4. run Oxfmt checks;
5. run Oxlint;
6. run any scoped Vue template linting;
7. type-check all packages;
8. run Vitest;
9. run Nuxt fixture tests;
10. build all modules;
11. type-check all playgrounds;
12. build all playgrounds;
13. pack all publishable packages;
14. validate package metadata and exports;
15. verify no private workspace imports leak into tarballs.

Initially, CI shall run against the complete repository.

Affected-package optimisation or a task runner such as Turborepo shall only be introduced when CI duration becomes a real problem.

---

## 17. Root scripts

The root package shall provide a consistent command contract:

```json
{
  "scripts": {
    "build": "pnpm --recursive build",
    "check": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build && pnpm pack:check",
    "format": "oxfmt --write .",
    "format:check": "oxfmt --check .",
    "lint": "oxlint --deny-warnings .",
    "lint:fix": "oxlint --fix .",
    "typecheck": "pnpm --recursive typecheck",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "pnpm --recursive --if-present test:e2e",
    "pack:check": "pnpm --recursive --if-present pack:check",
    "changeset": "changeset",
    "release:version": "changeset version",
    "release:publish": "changeset publish"
  }
}
```

Module playgrounds shall be runnable with pnpm filters:

```bash
pnpm --filter @repo/playground-nuxt-example dev
```

---

## 18. Documentation

The repository shall include:

```text
README.md
LICENSE
```

Each module shall include:

```text
README.md
CHANGELOG.md
```

The root README shall contain:

- the purpose of the repository;
- a table of available packages;
- local development instructions;
- playground commands;
- testing commands;
- changeset instructions;
- the manual release procedure;
- instructions for adding a new module.

Each module README shall contain:

- purpose;
- installation;
- module registration;
- configuration options;
- exposed runtime API;
- minimal usage examples;
- compatibility requirements.

No additional governance, support, security, or deprecation policy documents are required initially.

---

## 19. Adding a new module

Adding a new module shall require:

1. creating `modules/nuxt-<name>`;
2. naming it `@onderwijsin/nuxt-<name>`;
3. adding module source;
4. adding an isolated playground;
5. adding unit or integration tests;
6. adding package metadata;
7. adding a README;
8. adding an initial changelog;
9. validating the packed package;
10. adding the package to the root README;
11. publishing its initial version through the standard manual release process.

The package shall not require changes to root tooling configuration beyond package discovery.

---

## 20. Acceptance criteria

The repository is complete when:

- packages publish as `@onderwijsin/nuxt-*`;
- every package is public;
- every package has an independent version;
- every package has its own changelog;
- every module supports Nuxt 4;
- consumers may use Node.js 22 or newer;
- local development and CI use Node.js 24;
- every module has an isolated playground;
- compatible module combinations may be tested in an optional integration playground;
- shared runtime utilities are bundled into consuming modules;
- no private workspace imports appear in published tarballs;
- Oxfmt is used for formatting;
- Oxlint is used as the primary linter;
- Vitest is used for unit tests;
- Nuxt modules are tested using `@nuxt/test-utils`;
- module source, generated declarations, playgrounds, and packed artefacts are type-checked;
- pull request titles follow Conventional Commits;
- pull requests are squash merged;
- user-facing changes require Changesets;
- CI runs automatically but never versions or publishes packages;
- release preparation only runs through a manual trigger;
- publication only runs through a second manual trigger;
- npm publication runs through GitHub Actions;
- scoped packages are explicitly published publicly;
- failed publication workflows can be rerun safely;
- the repository contains an MIT licence.
