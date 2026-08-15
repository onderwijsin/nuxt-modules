/**
 * @fileoverview Validates publishable package metadata and package dependency contracts.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  containsPackageImport,
  discoverPrivateWorkspacePackages,
  discoverWorkspacePackages
} from "./package-validation.mjs";

const failures = [];
const root = resolve(import.meta.dirname, "..");

function findOutputFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findOutputFiles(path);
    return /\.(?:[cm]?js|[cm]?ts)$/u.test(entry.name) && statSync(path).isFile() ? [path] : [];
  });
}

const privatePackages = discoverPrivateWorkspacePackages(root);
for (const { directory, manifest: packageJson } of discoverWorkspacePackages(root)) {
  if (packageJson.private === true) continue;
  const name = packageJson.name;

  const requiredFiles = [
    "README.md",
    "CHANGELOG.md",
    packageJson.main?.replace(/^\.\//u, ""),
    packageJson.types?.replace(/^\.\//u, "")
  ].filter(Boolean);
  for (const file of requiredFiles) {
    if (!existsSync(join(directory, file))) failures.push(`${name}: missing ${file}`);
  }
  if (packageJson.publishConfig?.access !== "public")
    failures.push(`${name}: publishConfig.access must be public`);
  if (packageJson.engines?.node !== ">=22") failures.push(`${name}: engines.node must be >=22`);
  if (!packageJson.author || typeof packageJson.author !== "object" || !packageJson.author.name)
    failures.push(`${name}: author metadata is required`);
  if (!packageJson.repository?.url || !packageJson.repository?.directory)
    failures.push(`${name}: complete repository metadata is required`);

  const runtimeDependencies = {
    ...packageJson.dependencies,
    ...packageJson.optionalDependencies,
    ...packageJson.peerDependencies
  };
  for (const privatePackage of privatePackages) {
    if (privatePackage in runtimeDependencies)
      failures.push(`${name}: private ${privatePackage} must not be a runtime dependency`);
  }
  const distDirectory = join(directory, "dist");
  if (existsSync(distDirectory)) {
    for (const file of findOutputFiles(distDirectory)) {
      const output = readFileSync(file, "utf8");
      for (const privatePackage of privatePackages) {
        if (containsPackageImport(output, privatePackage))
          failures.push(`${name}: ${file.slice(directory.length + 1)} leaks ${privatePackage}`);
      }
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Published package metadata and build output are valid.");
