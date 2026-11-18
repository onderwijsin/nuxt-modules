# Testing

Vitest is the repository test runner. Tests are intentionally package-owned: each test should
exercise the package whose behavior it verifies, while the root Vitest configuration discovers and
runs the complete workspace suite.

Compatibility coverage follows the repository's
[compatibility testing policy](decisions/compatibility-testing.md): the suite runs on Node 24
against the pinned Nuxt dependency graph rather than a version matrix.

Read this article when selecting verification or adding, changing, relocating, or evaluating tests,
fixtures, mocks, coverage, or shared test infrastructure. Module authors should also read the
focused [module testing router](module-cookbook/testing.md).

Agents writing or reviewing tests must also use the maintainer
[`nuxt-test-utils` skill](../.agents/skills/nuxt-test-utils/SKILL.md), which routes these docs and
enforces the shared test-helper patterns.

## Testing philosophy

Test primarily the intended workflow, meaningful behavioral contracts, and concrete risks. Keep
rejection and failure cases when they protect a supported contract or plausible regression; do not
enumerate theoretical input misuse or preserve implementation history for its own sake.

The goal is the smallest maintainable suite that provides sufficient confidence. Coverage, test
count, and lines removed are not goals. A passing suite establishes only what its assertions
actually observe; mocked success alone does not prove runtime wiring or compatibility.

## Choosing and maintaining tests

When selecting or reviewing a test, establish:

1. The supported behavior and plausible regression it protects.
2. The production path exercised and meaningful observable result asserted.
3. An expected result independent of the implementation: a requirement, protocol example, known
   result, still-relevant regression, or independently derived invariant.
4. Why that regression would fail the assertion. For a new case, identify the protection existing
   tests leave missing.

Judge expectations against explicit current requirements. A changed requirement can supersede a
historical expectation; a cleanup preference cannot retire supported behavior or an error contract.

Prefer improving an existing test over adding redundant cases, excessive parameterization, or
assertions tied to private structure. A code edit, bug fix, new helper, or review finding does not
automatically require a permanent regression test, especially before a first release. Reproduce a
reported failure when practical and confirm the fix; add a lasting case only for a concrete gap in
protection. Types, caller inspection, or existing focused checks can be sufficient for a mechanical
change. Keep these decisions in working context; no permanent evidence ledger is required.

Apply [review-test-value](../.agents/skills/review-test-value/SKILL.md) when assessing tests and
their support. Use **keep**, **improve**, **consolidate**, or **remove**:

- Keep cases with distinct behavioral evidence, including supported error, safety, persistence,
  concurrency, compatibility, and resource contracts.
- Improve weak observations or expectations derived by repeating the implementation. An assertion
  guaranteed by mock setup cannot establish production behavior. Recorded characterization can
  protect unchanged behavior while providing weaker evidence of correctness; state that limit.
- Consolidate only when cases protect the same contract, meaningful input class, production path,
  result, and failure mode. Identify the surviving evidence; similar output alone is insufficient.
- Remove only with an account of what protection disappears. A green remaining suite does not by
  itself prove redundancy. Check surviving consumers before removing fixtures or helpers, and
  preserve uncertain cases until their value can be established.

Mocks, snapshots, and interaction assertions are techniques to judge by the evidence they provide.
Exact payloads, error formats, retry limits, or transaction ordering can be public contracts. Broad
integration coverage can miss a distinct low-level invariant. Use real integration or E2E checks
where mocks cannot establish the runtime boundary. Removing a test never authorizes removing the
production behavior it covered, even when that test is its clearest specification.

Confirm the runner discovers the intended cases and inspect relevant skips, deselections, fixtures,
and generated inputs. Investigate unexpected collection drops when changing tests or tooling.

## Selecting verification for a change

Choose local checks for the task's changed or explicitly reviewed surfaces and their affected
consumers. Unrelated dirty files do not expand that scope. Inspect package scripts and effective
configuration before choosing commands; [workspace tooling](workspace.md) owns environment safety,
preparation order, and package commands.

Use the narrowest check that establishes the affected contract. Combine matching rows; broaden when
a concrete failure, cross-package dependency, or runtime boundary requires it. Required hooks, CI,
build, package, and release gates remain in force. Passing a focused check does not establish a
broader skipped check.

| Affected surface                                                          | Local verification                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation only                                                        | Review content, links, and the scoped diff; run `git diff --check -- <paths>`. For new Markdown or substantial rewrites, run `pnpm exec oxfmt --check <paths>` and apply formatting only to those paths when needed. No code lint, typecheck, or tests for prose alone. |
| Source code                                                               | Check formatting and lint on affected files with `pnpm exec oxfmt --check <paths>` and `pnpm exec oxlint <paths>`. Select type and behavior checks for the risks below.                                                                                                 |
| Types, interfaces, imports, or TypeScript configuration                   | Run the owning package's typecheck and check affected consumers. Use `pnpm typecheck` when the boundary spans the workspace.                                                                                                                                            |
| Observable behavior                                                       | Run existing focused tests for the owning files or package. Add or improve permanent cases only under [the test policy](#choosing-and-maintaining-tests).                                                                                                               |
| Tests, fixtures, mocks, or test infrastructure                            | Run the affected test target; check collection or skips when discovery may change. Include typechecks for changed test types and widen to helper consumers or the full suite when shared infrastructure affects them.                                                   |
| Multiple interdependent packages or broad behavior changes                | Run affected checks across that dependency boundary; use `pnpm typecheck` and `pnpm test` for workspace-wide impact.                                                                                                                                                    |
| Module setup, generated types, or playground integration                  | Prepare with `pnpm dev:prepare`; build the owning module and typecheck/build the affected playground using the [package commands](workspace.md#working-with-packages).                                                                                                  |
| Public exports, dependency classification, or emitted runtime code        | Build affected packages, run `pnpm validate:packages`, inspect packed output, and validate the packed artifacts with the [external consumer](workspace.md#external-consumer-validation).                                                                                |
| New modules, major package features/refactors, or release readiness       | Run full formatting, lint, typecheck, tests, build, package validation, packing, and external-consumer validation from the [contribution workflow](contributing.md#validation-workflow) and [workspace guide](workspace.md).                                            |
| Module inventory, root README package entries, or consumer-skill coverage | Run `pnpm validate:docs`; it checks those surfaces, not general Markdown links or prose.                                                                                                                                                                                |

Once sufficient evidence is available, stop. Repeat checks after relevant fixes; broaden only for
new changes, failures, unresolved risks, or required gates. Use no-write commands for read-only
assessments. Keep formatting and autofixes scoped to task-owned changes.

Report exact commands and actual results, including blocked relevant checks and material gaps.
Distinguish pre-existing failures from regressions. Documentation-only work needs no new tests or
package builds; a test-only change needs no full suite unless its impact reaches that scope.

## Test utilities

`test-utils` is the private workspace package for helpers shared by tests. It is test-only and must
never be imported by published runtime code. The current API centralizes Nuxt fixture setup and
minimal H3 event construction; see the [test-utils cookbook article](module-cookbook/test-utils.md)
for the full reference.

Nuxt-specific integration helpers come from `@nuxt/test-utils`. Use that dependency when a test
needs a real Nuxt application, generated configuration, auto-import resolution, component
registration, or a built application. Do not use Nuxt integration machinery to test pure functions
or setup logic that can be observed directly.

## Patterns and conventions

Use Vitest's `describe`, `it`, `expect`, and `vi` APIs. Name suites after the unit under test and
name cases after observable behavior:

```ts
describe("useDraftForm", () => {
  it("keeps local edits when the source changes", async () => {
    // Arrange, act, and assert the consumer-visible behavior.
  });
});
```

Follow these conventions:

- Prefer focused behavior tests over implementation-detail tests.
- Arrange realistic inputs, perform the public action, and assert the resulting state, calls,
  registrations, or errors.
- Use `vi.fn()` for collaborators such as save handlers and loggers; assert meaningful calls without
  over-specifying incidental call order.
- Import package source directly for unit tests so failures identify the source behavior. Test
  generated output separately through build or packed artefact validation.
- Keep tests deterministic and isolated. Create fresh reactive state and mocks per test, and reset
  mutable mocks in `beforeEach` where needed.
- Use explicit Vue imports such as `ref` and `nextTick` in composable tests; do not rely on Nuxt
  auto-imports in package unit tests.
- Use asynchronous assertions and `await nextTick()` when testing reactive updates or async
  submission behavior.
- Keep test names and fixtures close to the domain behavior they describe. Avoid broad snapshots
  when a small set of explicit assertions explains the contract more clearly.

The root configuration includes `*.test.*` and `*.spec.*` files and excludes `node_modules`,
`.nuxt`, `.output`, and `dist`:

```ts
include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"];
```

## Choosing the test layer

Choose the smallest layer that proves the selected behavior. The examples below identify useful
contracts, not a mandatory checklist for every utility, module, or change.

### Shared utilities

Test pure utilities with direct inputs and outputs. Select normal values and boundary or failure
cases for their distinct contracts and risks. For example, `@onderwijsin/nuxt-module-utils` tests
module naming, logger scopes, prepare-mode detection, and setup lifecycle behavior.

### Module entrypoints

Useful module setup contracts include:

- explicit metadata and compatibility;
- declared module dependencies;
- enabled setup and registered runtime directories;
- disabled setup and its resulting behavior;
- option normalization or boundary validation when options accept external input.

Mock `@nuxt/kit` when registrations and lifecycle calls are the setup contract under test. Assert
the production setup's decisions rather than restating mocked metadata or helper behavior. These
tests cannot establish that Nuxt resolves the generated output correctly.

### Runtime composables and components

Test consumer-visible state transitions and side effects. For a form composable, this includes
cloning without source mutation, dirty-state tracking, synchronization while clean, preservation of
local edits while dirty, successful submission, loading state, and failed-save handling.

### Nuxt integration and end-to-end behavior

Add `@nuxt/test-utils` integration tests when correctness depends on Nuxt's module loader, generated
aliases, auto-imports, registered components, runtime plugins, or application build output. Use a
minimal fixture that proves the behavior and assert what a consumer can observe.

Do not add integration or end-to-end tests solely to increase coverage. The repository has focused
Nuxt Test Utils fixture coverage for modules and behaviors that require a real Nuxt application;
some publishable modules, such as the pure server utilities, are covered by unit tests without a
Nuxt fixture. Keep assertions limited to runtime behavior that depends on Nuxt, such as registered
components, auto-imports, runtime plugins, pages, and server handlers.

Exercise generated server handlers through the real endpoint when runtime wiring is the contract.
For example, the healthcheck fixture uses a custom component with a short `setTimeout` to verify
consumer-file discovery and measured component timing. Assert the selected public route contract
with `$fetch`, such as plain-text ping responses or parsed JSON health responses.

## Test locations

Place tests in an `__tests__/` directory inside the package they exercise:

```text
packages/module-utils/__tests__/setup.test.ts
packages/test-utils/__tests__/<helper>.test.ts
modules/ui-form-extensions/__tests__/module.test.ts
modules/ui-form-extensions/__tests__/draft-form.test.ts
```

Keep Nuxt fixtures and integration tests under the module package as well, using a clear
subdirectory when there are multiple layers, for example:

```text
modules/<module-name>/__tests__/
├── unit/
├── integration/
└── fixtures/
```

The module fixtures in this repository are intentionally minimal Nuxt apps. Configure the module
from its source entrypoint in `fixtures/<name>/nuxt.config.ts`, then call `setupFixture` and the
re-exported request helpers from `packages/test-utils` in the owning module's `e2e.test.ts`. This
follows Nuxt's fixture-based E2E workflow and keeps each test isolated from playground-only
configuration.

Nuxt Test Utils stores its active fixture context in module-local state. pnpm can resolve different
peer-instantiated copies of `@nuxt/test-utils` for the private helper package and a module package;
mixing `setupFixture` from `packages/test-utils` with `$fetch`, `fetch`, `url`, `setup`, or
`useTestContext` imported directly from `@nuxt/test-utils/e2e` then makes setup and requests use
different contexts. Always use the re-exports from `packages/test-utils` so all helpers share one
module instance.

Do not place module tests in the root test directory or in a shared package. Shared helpers belong
in `packages/test-utils`; tests for those helpers belong in `packages/test-utils/__tests__/`. Test
files are not published because publishable modules expose only their intended `dist` artefacts.

## Running tests

Run the complete unit test suite with:

```sh
pnpm test
```

Generate the CI coverage reports locally with:

```sh
pnpm test:coverage
```

Coverage uses the V8 provider and writes text, JSON summary, and Cobertura reports under
`coverage/`. It includes module and package source files while excluding generated output,
playgrounds, fixtures, and tests. Coverage has no thresholds and is observational only.

Use watch mode while developing:

```sh
pnpm test:watch
```

Run one package's tests directly from the repository root:

```sh
pnpm exec vitest run modules/ui-form-extensions/__tests__
pnpm exec vitest run packages/module-utils/__tests__
```

The Directus client Valkey E2E suite requires a local ephemeral Valkey instance because it starts
two independent Nitro processes and coordinates them through real Redis storage. Start the pinned
Valkey image, run the focused suite with `DIRECTUS_E2E_REDIS_URL`, then remove the container:

```sh
pnpm valkey:e2e:start

DIRECTUS_E2E_REDIS_URL=redis://127.0.0.1:16379 \
  pnpm exec vitest run modules/directus-client/__tests__/e2e-valkey.test.ts

pnpm valkey:e2e:stop
```

When `DIRECTUS_E2E_REDIS_URL` is not set, this suite is skipped during ordinary local test runs.

Package-level type checks run recursively with:

```sh
pnpm typecheck
```

Select other checks under [verification selection](#selecting-verification-for-a-change), rather
than running every workspace command for every change.
