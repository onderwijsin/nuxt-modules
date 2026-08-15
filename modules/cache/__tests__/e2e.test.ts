import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { $fetch, fetch, resolveFixture, setupFixture } from "../../../packages/test-utils/src";
import { packPackage } from "./helpers/pack-package";

const ARTICLE_PATH = "/kennisbank/artikelen/example-slug";
const moduleRoot = new URL("../", import.meta.url);
const fixtureRoot = resolveFixture(import.meta.url, "e2e");
const packedModuleDirectory = join(fixtureRoot, "node_modules", "@onderwijsin", "nuxt-cache");
const packedPackage = packPackage(fileURLToPath(moduleRoot), "nuxt-cache-e2e-pack-");
const invalidationBody = {
  targets: [{ base: "kennisbank:articles", path: ARTICLE_PATH, match: "exact" }]
};

/** Packs the module and installs its tarball at the e2e fixture's package-resolution boundary. */
function preparePackedModuleFixture(): void {
  rmSync(packedModuleDirectory, { force: true, recursive: true });
  mkdirSync(packedModuleDirectory, { recursive: true });
  execFileSync(
    "tar",
    ["-xzf", packedPackage.tarballPath, "--strip-components=1", "-C", packedModuleDirectory],
    { stdio: "pipe" }
  );
}

describe("cache module end to end", async () => {
  preparePackedModuleFixture();
  await setupFixture(import.meta.url, "e2e", { dev: false });

  afterAll(() => {
    rmSync(packedModuleDirectory, { force: true, recursive: true });
    packedPackage.cleanup();
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
