# Working with `test-utils`

Read this article before adding a shared test helper or repeating fixture/H3-event setup across
packages. Also read the detailed [testing guide](../testing.md).

When writing or reviewing any repository test, use the maintainer skill at
[`../../.agents/skills/nuxt-test-utils/SKILL.md`](../../.agents/skills/nuxt-test-utils/SKILL.md).
This article remains the API source of truth; the skill supplies the test-layer and shared-helper
checklist.

`packages/test-utils` is a private workspace package for behavior shared by package tests. Use it
when the same setup or test infrastructure is needed by more than one package; keep domain-specific
fixtures, mocks, and assertions next to the tests that own them. Never import it from published
runtime code.

## API reference

| Helper            | Signature                                                                                                                | Purpose                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `createTestEvent` | `createTestEvent(): H3Event`                                                                                             | Creates a minimal H3 event with request and response objects for server-handler tests.                 |
| `resolveFixture`  | `resolveFixture(metaUrl: string \| URL, fixture?: string): string`                                                       | Resolves `./fixtures/<fixture>` relative to a test file; the fixture defaults to `basic`.              |
| `setupFixture`    | `setupFixture(metaUrl: string \| URL, fixture?: string, options?: Partial<Omit<TestOptions, "rootDir">>): Promise<void>` | Starts `@nuxt/test-utils` with a fixture-relative `rootDir`, while preserving additional test options. |
| `$fetch`          | Nuxt Test Utils `$fetch`                                                                                                 | Sends requests to the fixture using the same test context as `setupFixture`.                           |
| `fetch`           | Nuxt Test Utils `fetch`                                                                                                  | Sends requests to the fixture when response status and headers are needed.                             |
| `url`             | Nuxt Test Utils `url(path)`                                                                                              | Resolves a fixture-relative URL using the active test context.                                         |
| `setup`           | Nuxt Test Utils `setup(options)`                                                                                         | Registers a custom Nuxt Test Utils fixture setup.                                                      |
| `useTestContext`  | Nuxt Test Utils `useTestContext()`                                                                                       | Reads the active Nuxt Test Utils context for advanced integration assertions.                          |

## Examples

Use `setupFixture` in an E2E test instead of repeating URL conversion and `setup` boilerplate:

```ts
import { $fetch, setupFixture } from "test-utils";

describe("example module", async () => {
  await setupFixture(import.meta.url);

  it("serves the fixture", async () => {
    await expect($fetch("/")).resolves.toContain("fixture");
  });
});
```

Pass the fixture directory name and any supported Nuxt Test Utils options when needed:

```ts
await setupFixture(import.meta.url, "production", { dev: false });
```

Import Nuxt Test Utils request and context helpers from `test-utils`, not directly from
`@nuxt/test-utils/e2e`. The shared package owns `setupFixture` and re-exports these helpers so they
all resolve through one `@nuxt/test-utils` module instance. Nuxt Test Utils stores its active
context in module-local state; resolving `setup` and `$fetch` from different peer-instantiated
copies causes `$fetch` to report `No context is available` even though fixture setup ran.

`setupFixture` performs a best-effort startup cleanup of abandoned Nuxt Test Utils build directories
older than 24 hours under the selected fixture's `.nuxt/test/` directory. Fresh builds are preserved
for the active run, while stale builds from interrupted or crashed test runs are removed. The
cleanup is intentionally limited to Nuxt Test Utils' six-character build directory names and does
not make test failure depend on cleanup succeeding.

Use `createTestEvent` for pure server-handler tests that need an H3 event but do not need a running
Nuxt application:

```ts
const event = createTestEvent();
await expect(handler(event)).resolves.toEqual({ data: { ok: true } });
```
