import { access, mkdir, mkdtemp, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupStaleNuxtTestBuilds } from "../src";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  );
});

describe("cleanupStaleNuxtTestBuilds", () => {
  it("removes stale generated builds but preserves fresh and unrelated directories", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "nuxt-test-utils-cleanup-"));
    temporaryDirectories.push(rootDir);

    const testBuildRoot = join(rootDir, ".nuxt", "test");
    const staleBuild = join(testBuildRoot, "abc123");
    const freshBuild = join(testBuildRoot, "def456");
    const unrelatedDirectory = join(testBuildRoot, "keep-me");
    await Promise.all([
      mkdir(staleBuild, { recursive: true }),
      mkdir(freshBuild, { recursive: true }),
      mkdir(unrelatedDirectory, { recursive: true })
    ]);

    const now = Date.now();
    await utimes(
      staleBuild,
      new Date(now - 25 * 60 * 60 * 1000),
      new Date(now - 25 * 60 * 60 * 1000)
    );

    await expect(cleanupStaleNuxtTestBuilds(rootDir, now)).resolves.toBe(1);
    await expect(rm(staleBuild)).rejects.toThrow();
    await expect(access(freshBuild)).resolves.toBeUndefined();
    await expect(access(unrelatedDirectory)).resolves.toBeUndefined();
  });
});
