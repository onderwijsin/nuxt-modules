import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type PackedPackage = {
  outputDirectory: string;
  tarballPath: string;
  cleanup: () => void;
};

/**
 * Packs a package into a temporary directory and returns its tarball path.
 * @param packageRoot The package directory to pack.
 * @param prefix The temporary-directory prefix.
 * @returns The packed tarball and cleanup function.
 */
export function packPackage(packageRoot: string, prefix = "nuxt-cache-pack-"): PackedPackage {
  const outputDirectory = mkdtempSync(join(tmpdir(), prefix));

  try {
    execFileSync("corepack", ["pnpm", "pack", "--pack-destination", outputDirectory], {
      cwd: packageRoot,
      stdio: "pipe"
    });
    const [tarball] = readdirSync(outputDirectory)
      .filter((file) => file.endsWith(".tgz"))
      .map((file) => join(outputDirectory, file));
    if (!tarball) throw new Error("Expected pnpm pack to create a package tarball.");

    return {
      outputDirectory,
      tarballPath: tarball,
      cleanup: () => rmSync(outputDirectory, { force: true, recursive: true })
    };
  } catch (error) {
    rmSync(outputDirectory, { force: true, recursive: true });
    throw error;
  }
}
