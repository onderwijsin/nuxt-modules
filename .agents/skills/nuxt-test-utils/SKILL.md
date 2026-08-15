---
name: nuxt-test-utils
description: Use whenever writing, changing, reviewing, or relocating tests, fixtures, mocks, or shared test infrastructure in this repository. Route test work through the repository testing docs and use the private test-utils package for shared fixture and H3 setup.
---

# Nuxt Test Utils

Use this skill for every test task. Choose the smallest test layer that proves the observable
contract, and use shared test utilities when setup is genuinely shared across packages.

## Route before editing

Read these sources before changing tests:

1. [`AGENTS.md`](../../../AGENTS.md) and [`docs/agent-workflow.md`](../../../docs/agent-workflow.md).
2. [`docs/testing.md`](../../../docs/testing.md) for repository-wide test conventions.
3. [`module-cookbook/testing.md`](../../../docs/module-cookbook/testing.md) for module test routing.
4. [`module-cookbook/test-utils.md`](../../../docs/module-cookbook/test-utils.md) when using or
   changing `packages/test-utils`.

Inspect the owning package and a comparable nearby test. Keep tests beside the package whose
behavior they verify, under `__tests__/`; keep fixtures beside the owning module.

## Choose the test layer

- Test pure functions and module setup directly with focused Vitest tests.
- Mock `@nuxt/kit` when setup registrations are the contract under test.
- Use `@nuxt/test-utils` only when correctness depends on a real Nuxt application, generated
  configuration, aliases, auto-imports, registered components, runtime plugins, routes, or build
  output.
- Use a minimal fixture and assert consumer-visible behavior, usually through `$fetch`.

Do not use Nuxt integration machinery for logic observable through a direct function call. Avoid
broad snapshots and assertions about incidental call order; name tests after behavior and assert
the smallest meaningful contract.

## Use the private `test-utils` package

`test-utils` is test-only. It may be imported by tests and fixtures, never by published runtime
code. Reuse its helpers when the setup is shared or when they encode the repository fixture
contract:

```ts
import { $fetch } from "@nuxt/test-utils/e2e";
import { setupFixture } from "test-utils";

describe("example module", async () => {
  await setupFixture(import.meta.url);

  it("serves the fixture", async () => {
    await expect($fetch("/")).resolves.toContain("fixture");
  });
});
```

Use `setupFixture(import.meta.url, "fixture-name", options)` for fixture-relative Nuxt setup. It
handles the repository's fixture root and stale test-build cleanup. Use `createTestEvent()` for a
pure server-handler test that needs a minimal H3 event, without starting Nuxt:

```ts
const event = createTestEvent();
await expect(handler(event)).resolves.toEqual({ data: { ok: true } });
```

Use `resolveFixture()` when a test needs the absolute path to a fixture. Add a new shared helper
only when the setup has multiple credible consumers; keep one-off domain mocks and assertions in
the owning test package.

## Test utility patterns

| Prefer | Instead of |
| --- | --- |
| `setupFixture(import.meta.url, name, options)` | repeating fixture URL conversion and Nuxt `setup` boilerplate |
| `createTestEvent()` | hand-building request/response objects for each server test |
| direct imports of source and explicit Vue imports in unit tests | relying on Nuxt auto-imports outside an integration fixture |
| fresh state and reset mocks per test | sharing mutable fixtures or mock state across cases |
| explicit behavior assertions | broad snapshots or implementation-detail assertions |

## Completion checklist

Before handoff, confirm every item:

- The routed testing and module-testing docs were read.
- The test layer matches the behavior under test; integration is present only where Nuxt behavior
  is part of the contract.
- Tests live in the owning package and use deterministic, isolated state.
- Existing `test-utils` helpers were reused where their documented semantics match.
- New shared test infrastructure is in `packages/test-utils`, is test-only, and has focused tests
  in `packages/test-utils/__tests__/`.
- If `packages/test-utils` changed, its cookbook documentation, tests, exports, and this maintainer
  skill are synchronized.
- Formatting, linting, type checking, and applicable tests were run or their exact blocker is
  recorded.
