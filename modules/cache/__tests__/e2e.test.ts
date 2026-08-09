import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { $fetch, fetch, setup } from "@nuxt/test-utils/e2e";

const ARTICLE_PATH = "/kennisbank/artikelen/example-slug";
const invalidationBody = {
  targets: [{ base: "kennisbank:articles", path: ARTICLE_PATH, match: "exact" }]
};

describe("cache module end to end", async () => {
  await setup({
    rootDir: fileURLToPath(new URL("./fixtures/e2e", import.meta.url)),
    dev: false
  });

  it("creates indexed metadata, invalidates it, and creates a fresh entry on the next public request", async () => {
    const first = await $fetch<{
      data: {
        value: { id: string };
        metadata: { version?: number; path?: string };
        cacheStatus: string;
      };
    }>(ARTICLE_PATH);
    expect(first.data.cacheStatus).toBe("miss");
    expect(first.data.metadata).toMatchObject({ version: 1, path: ARTICLE_PATH });

    const second = await $fetch<typeof first>(ARTICLE_PATH);
    expect(second.data.cacheStatus).toBe("hit");
    expect(second.data.value.id).toBe(first.data.value.id);

    await expect(
      $fetch("/api/_cache/invalidate", {
        method: "POST",
        headers: { "x-admin-token": "fixture-admin-token" },
        body: invalidationBody
      })
    ).resolves.toEqual({ data: { removed: 1 } });

    await expect($fetch("/api/cache-state")).resolves.toMatchObject({
      data: { value: null }
    });

    const afterInvalidation = await $fetch<typeof first>(ARTICLE_PATH);
    expect(afterInvalidation.data.cacheStatus).toBe("miss");
    expect(afterInvalidation.data.value.id).not.toBe(first.data.value.id);
  });

  it("requires authentication and validates the public invalidation body", async () => {
    const unauthorized = await fetch("/api/_cache/invalidate", {
      method: "POST",
      body: JSON.stringify(invalidationBody),
      headers: { "content-type": "application/json" }
    });
    expect(unauthorized.status).toBe(401);

    const invalid = await fetch("/api/_cache/invalidate", {
      method: "POST",
      body: JSON.stringify({ targets: [{ base: "not-a-base", path: "missing-slash" }] }),
      headers: { "content-type": "application/json", "x-admin-token": "fixture-admin-token" }
    });
    expect(invalid.status).toBe(400);
  });
});
