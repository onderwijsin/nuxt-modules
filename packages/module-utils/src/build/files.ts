import { existsSync, readdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

const SOURCE_EXTENSIONS = new Set([".js", ".mjs", ".ts", ".mts"]);

/**
 * Recursively discovers JavaScript and TypeScript source files for Nuxt module build steps.
 *
 * Declaration files are excluded because they cannot supply a runtime default export. Returned
 * paths are absolute and lexicographically sorted, which gives generated registries stable output
 * and an intentional precedence order.
 *
 * @param directory - Directory to scan. A missing directory produces no files.
 * @returns Supported source files in deterministic path order.
 */
export function discoverSourceFiles(directory: string): string[] {
  const files: string[] = [];

  function visit(currentDirectory: string): void {
    if (!existsSync(currentDirectory)) return;

    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const path = join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (SOURCE_EXTENSIONS.has(extname(entry.name)) && !basename(path).endsWith(".d.ts")) {
        files.push(resolve(path));
      }
    }
  }

  visit(directory);
  return files.sort((left, right) => left.localeCompare(right));
}
