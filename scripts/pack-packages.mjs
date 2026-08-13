/**
 * Packs every public workspace package into a directory and writes a manifest for consumers.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(
  process.argv.find(
    (argument) =>
      !argument.startsWith("--") && argument !== process.argv[0] && argument !== process.argv[1]
  ) ?? join(root, ".artifacts", "packages")
);
const requestedNames = new Set(
  process.argv
    .find((argument) => argument.startsWith("--packages="))
    ?.slice("--packages=".length)
    .split(/\s+/u)
    .filter(Boolean) ?? []
);
mkdirSync(outputDirectory, { recursive: true });

/**
 * Returns public package manifests in workspace package directories.
 *
 * @returns {{directory: string, manifest: {name: string, private?: boolean, version?: string}}[]} Public package entries.
 */
function discoverPackages() {
  return ["packages", "modules"].flatMap((packageRoot) =>
    readdirSync(join(root, packageRoot), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const directory = join(root, packageRoot, entry.name);
        const packageFile = join(directory, "package.json");
        if (!existsSync(packageFile)) return null;
        return { directory, manifest: JSON.parse(readFileSync(packageFile, "utf8")) };
      })
      .filter(Boolean)
  );
}

const allPackages = discoverPackages();
if (requestedNames.size) {
  const knownNames = new Set(allPackages.map(({ manifest }) => manifest.name));
  const missing = [...requestedNames].filter((name) => !knownNames.has(name));
  if (missing.length)
    throw new Error(`Cannot pack unknown workspace packages: ${missing.join(", ")}`);
}
const packages = allPackages.filter(
  ({ manifest }) =>
    manifest.private !== true && (!requestedNames.size || requestedNames.has(manifest.name))
);
const artifacts = [];

for (const { directory, manifest } of packages) {
  const output = execFileSync(
    "corepack",
    ["pnpm", "--filter", manifest.name, "pack", "--pack-destination", outputDirectory, "--json"],
    { cwd: root, encoding: "utf8" }
  );
  const packed = JSON.parse(output.trim());
  const archive = resolve(packed.filename);

  execFileSync("node", ["scripts/check-packed-package.mjs", archive], {
    cwd: root,
    stdio: "inherit"
  });
  execFileSync("corepack", ["pnpm", "exec", "publint", directory], {
    cwd: root,
    stdio: "inherit"
  });

  artifacts.push({
    name: manifest.name,
    version: manifest.version,
    filename: archive.slice(outputDirectory.length + 1)
  });
}

writeFileSync(
  join(outputDirectory, "manifest.json"),
  `${JSON.stringify({ artifacts }, null, 2)}\n`
);
console.log(`Packed ${artifacts.length} public packages into ${outputDirectory}`);
