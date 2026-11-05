import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { useTestContext } from "../../../../packages/test-utils/src";

/**
 * Collects emitted JavaScript without source maps or copied package metadata.
 * @param directory - Build output directory to inspect recursively.
 * @returns All emitted JavaScript in one string.
 */
function readJavaScript(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? readJavaScript(path)
        : /\.(?:m?js)$/.test(entry.name)
          ? readFileSync(path, "utf8")
          : "";
    })
    .join("\n");
}

/**
 * Reads the actual client and SSR JavaScript produced by the active Nuxt fixture.
 * @returns Client and server bundles for feature-inclusion regression assertions.
 */
export function readRendererBundles(): string[] {
  const nuxt = useTestContext().nuxt;
  if (!nuxt) throw new Error("Nuxt fixture context is unavailable");
  return [
    readJavaScript(join(nuxt.options.buildDir, "dist/client")),
    readJavaScript(join(nuxt.options.buildDir, "dist/server"))
  ];
}
