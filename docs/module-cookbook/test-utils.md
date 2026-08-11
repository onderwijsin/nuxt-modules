# Working with `test-utils`

Read this article before adding a shared test helper or repeating fixture/H3-event setup across
packages. Also read the detailed [testing guide](../testing.md).

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

## Examples

Use `setupFixture` in an E2E test instead of repeating URL conversion and `setup` boilerplate:

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

Pass the fixture directory name and any supported Nuxt Test Utils options when needed:

```ts
await setupFixture(import.meta.url, "production", { dev: false });
```

Use `createTestEvent` for pure server-handler tests that need an H3 event but do not need a running
Nuxt application:

```ts
const event = createTestEvent();
await expect(handler(event)).resolves.toEqual({ data: { ok: true } });
```
