import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

/**
 * Discovers package manifests in the workspace package roots.
 *
 * @param {string} workspaceRoot - Repository root to inspect.
 * @returns {{directory: string, manifest: Record<string, any>}[]} Workspace packages.
 */
export function discoverWorkspacePackages(workspaceRoot = root) {
  return ["packages", "modules"].flatMap((packageRoot) => {
    const directory = join(workspaceRoot, packageRoot);
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(directory, entry.name))
      .flatMap((packageDirectory) => {
        const packageFile = join(packageDirectory, "package.json");
        if (!existsSync(packageFile)) return [];
        return [
          {
            directory: packageDirectory,
            manifest: JSON.parse(readFileSync(packageFile, "utf8"))
          }
        ];
      });
  });
}

/**
 * Returns names of every private workspace package.
 *
 * @param {string} workspaceRoot - Repository root to inspect.
 * @returns {Set<string>} Private workspace package names.
 */
export function discoverPrivateWorkspacePackages(workspaceRoot = root) {
  return new Set(
    discoverWorkspacePackages(workspaceRoot)
      .filter(({ manifest }) => manifest.private === true && typeof manifest.name === "string")
      .map(({ manifest }) => manifest.name)
  );
}

/**
 * Finds imports of a package in emitted JavaScript.
 *
 * @param {string} source - Emitted source to inspect.
 * @param {string} packageName - Package name to find.
 * @returns {boolean} Whether the source imports the package.
 */
export function containsPackageImport(source, packageName) {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(
    `(?:from|import)\\s*(?:\\(\\s*)?["']${escaped}(?:/[^"']*)?["']|require\\s*\\(\\s*["']${escaped}(?:/[^"']*)?["']`,
    "u"
  ).test(source);
}

export { root as workspaceRoot };
