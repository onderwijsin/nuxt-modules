/**
 * @fileoverview Validates publishable package metadata and private dependency bundling.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const failures = [];

for (const entry of readdirSync(join(root, "modules"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const directory = join(root, "modules", entry.name);
  const packageFile = join(directory, "package.json");
  if (!existsSync(packageFile)) continue;
  const packageJson = JSON.parse(readFileSync(packageFile, "utf8"));
  if (packageJson.private === true) continue;
  const name = packageJson.name;

  for (const file of ["README.md", "CHANGELOG.md", "dist/module.mjs", "dist/types.d.mts"]) {
    if (!existsSync(join(directory, file))) failures.push(`${name}: missing ${file}`);
  }
  if (packageJson.publishConfig?.access !== "public")
    failures.push(`${name}: publishConfig.access must be public`);
  if (packageJson.engines?.node !== ">=22") failures.push(`${name}: engines.node must be >=22`);
  if (!packageJson.repository?.url || !packageJson.repository?.directory)
    failures.push(`${name}: complete repository metadata is required`);

  const runtimeDependencies = {
    ...packageJson.dependencies,
    ...packageJson.optionalDependencies,
    ...packageJson.peerDependencies
  };
  for (const privatePackage of ["module-utils", "test-utils"]) {
    if (privatePackage in runtimeDependencies)
      failures.push(`${name}: private ${privatePackage} must not be a runtime dependency`);
  }
  if (existsSync(join(directory, "dist/module.mjs"))) {
    const output = readFileSync(join(directory, "dist/module.mjs"), "utf8");
    for (const privatePackage of ["module-utils", "test-utils"]) {
      if (new RegExp(`from\\s+["']${privatePackage}["']`).test(output))
        failures.push(`${name}: dist/module.mjs leaks ${privatePackage}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Published package metadata and build output are valid.");
