import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { $fetch, fetch, setup } from "@nuxt/test-utils/e2e";

const ARTICLE_PATH = "/kennisbank/artikelen/example-slug";
const moduleRoot = fileURLToPath(new URL("../", import.meta.url));
const fixtureRoot = fileURLToPath(new URL("./fixtures/e2e", import.meta.url));
const packedOutputDirectory = mkdtempSync(join(tmpdir(), "nuxt-cache-e2e-pack-"));
const packedModuleDirectory = join(fixtureRoot, "node_modules", "@onderwijsin", "nuxt-cache");
const invalidationBody = {
  targets: [{ base: "kennisbank:articles", path: ARTICLE_PATH, match: "exact" }]
};

/** Packs the module and installs its tarball at the e2e fixture's package-resolution boundary. */
function preparePackedModuleFixture(): void {
  execFileSync("corepack", ["pnpm", "pack", "--pack-destination", packedOutputDirectory], {
    cwd: moduleRoot,
    stdio: "pipe"
  });
  const [tarball] = readdirSync(packedOutputDirectory).filter((file) => file.endsWith(".tgz"));
  if (!tarball) throw new Error("Expected pnpm pack to create a cache module tarball.");

  rmSync(packedModuleDirectory, { force: true, recursive: true });
  mkdirSync(packedModuleDirectory, { recursive: true });
  execFileSync(
    "tar",
    [
      "-xzf",
      join(packedOutputDirectory, tarball),
      "--strip-components=1",
      "-C",
      packedModuleDirectory
    ],
    { stdio: "pipe" }
  );
}

describe("cache module end to end", async () => {
  preparePackedModuleFixture();
  await setup({
    rootDir: fixtureRoot,
    dev: false
  });

  afterAll(() => {
    rmSync(packedModuleDirectory, { force: true, recursive: true });
    rmSync(packedOutputDirectory, { force: true, recursive: true });
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
