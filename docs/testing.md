# Testing

Vitest is the repository test runner. Tests are intentionally package-owned: each test should
exercise the package whose behavior it verifies, while the root Vitest configuration discovers and
runs the complete workspace suite.

## Test utilities

`test-utils` is the private workspace package for helpers shared by tests. It is test-only and must
never be imported by published runtime code. It is available to centralize fixture builders, Vitest
helpers, assertions, package inspection helpers, and other genuinely shared testing behavior as the
repository grows.

The package currently provides an empty public entrypoint and is reserved for shared test
infrastructure. Keep one-off fixtures and assertions in the test package that owns them until a
second package needs the same behavior. This keeps the private package small and avoids coupling
unrelated modules.

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

## What to test

Test the behavior that could regress and the public contract that consumers depend on.

### Shared utilities

Test pure utilities with direct inputs and outputs. Cover normal values, important boundary cases,
and failures or disabled paths. For example, `@onderwijsin/nuxt-module-utils` tests module naming,
logger scopes, prepare-mode detection, and setup lifecycle behavior.

### Module entrypoints

Test the module definition's observable Nuxt contract:

- explicit metadata and compatibility;
- declared module dependencies;
- enabled setup and registered runtime directories;
- disabled setup and its resulting behavior;
- option normalization or boundary validation when options accept external input.

Mock `@nuxt/kit` when unit-testing entrypoint setup. This keeps the test fast and makes
registrations and lifecycle calls directly observable.

### Runtime composables and components

Test consumer-visible state transitions and side effects. For a form composable, this includes
cloning without source mutation, dirty-state tracking, synchronization while clean, preservation of
local edits while dirty, successful submission, loading state, and failed-save handling.

### Nuxt integration and end-to-end behavior

Add `@nuxt/test-utils` integration tests when correctness depends on Nuxt's module loader, generated
aliases, auto-imports, registered components, runtime plugins, or application build output. Use a
minimal fixture that proves the behavior and assert what a consumer can observe.

Do not add integration or end-to-end tests solely to increase coverage. The repository has focused
Nuxt Test Utils fixture coverage for each publishable module. Keep assertions limited to runtime
behavior that depends on Nuxt, such as registered components, auto-imports, runtime plugins, pages,
and server handlers.

For generated server handlers, include a fixture custom component and exercise the real endpoint.
For example, a component that awaits a short `setTimeout` verifies both that consumer files are
discovered and that the response includes measured component timing. Assert the public route
contract with `$fetch`, including plain-text ping responses and parsed JSON health responses.

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
from its source entrypoint in `fixtures/<name>/nuxt.config.ts`, then call `setup` and `$fetch` from
`@nuxt/test-utils/e2e` in the owning module's `e2e.test.ts`. This follows Nuxt's fixture-based E2E
workflow and keeps each test isolated from playground-only configuration.

Do not place module tests in the root test directory or in a shared package. Shared helpers belong
in `packages/test-utils`; tests for those helpers belong in `packages/test-utils/__tests__/`. Test
files are not published because publishable modules expose only their intended `dist` artefacts.

## Running tests

Run the complete unit test suite with:

```sh
pnpm test
```

Use watch mode while developing:

```sh
pnpm test:watch
```

Run one package's tests directly from the repository root:

```sh
pnpm exec vitest run modules/ui-form-extensions/__tests__
pnpm exec vitest run packages/module-utils/__tests__
```

Package-level type checks run recursively with:

```sh
pnpm typecheck
```

Before handing off a change, also run formatting, linting, the recursive build, and package
validation as described in the repository's validation workflow.
