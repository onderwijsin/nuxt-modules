import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const STALE_TEST_BUILD_AGE_MS = 24 * 60 * 60 * 1000;
const TEST_BUILD_DIRECTORY_NAME = /^[a-z0-9]{6}$/;

/**
 * Removes abandoned Nuxt Test Utils build directories from a fixture.
 *
 * @param rootDir The Nuxt fixture root directory.
 * @param now The current timestamp, injectable for deterministic tests.
 * @returns The number of stale build directories removed.
 */
export async function cleanupStaleNuxtTestBuilds(
  rootDir: string,
  now = Date.now()
): Promise<number> {
  const testBuildRoot = join(rootDir, ".nuxt", "test");
  let entries;

  try {
    entries = await readdir(testBuildRoot, { withFileTypes: true });
  } catch {
    return 0;
  }

  let removed = 0;
  const staleBefore = now - STALE_TEST_BUILD_AGE_MS;

  for (const entry of entries) {
    if (!entry.isDirectory() || !TEST_BUILD_DIRECTORY_NAME.test(entry.name)) continue;

    const buildDir = join(testBuildRoot, entry.name);

    try {
      const details = await stat(buildDir);
      if (details.mtimeMs >= staleBefore) continue;

      await rm(buildDir, { force: true, recursive: true });
      removed += 1;
    } catch {
      // Cleanup is best effort; a stale artifact must not make the test suite fail.
    }
  }

  return removed;
}
