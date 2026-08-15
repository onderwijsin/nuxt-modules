import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { discoverWorkspacePackages } from "./package-validation.mjs";

const root = resolve(import.meta.dirname, "..");

/**
 * Validates the repository's generated-by-convention module documentation surfaces.
 *
 * @param {string} repositoryRoot - Repository root to inspect.
 * @returns {string[]} Human-readable validation failures.
 */
export function validateDocumentation(repositoryRoot = root) {
  const failures = [];
  const readme = readFileSync(join(repositoryRoot, "README.md"), "utf8");
  const skillsDirectory = join(repositoryRoot, "skills");
  const tableEntries = new Map();
  for (const line of readme.split("\n")) {
    const match = line.match(/\|\s+\[`([^`]+)`\]\(([^)]+)\)\s+\|/u);
    if (match) tableEntries.set(match[1], match[2]);
  }

  for (const { directory, manifest } of discoverWorkspacePackages(repositoryRoot)) {
    if (manifest.private === true || !directory.includes(`${join(repositoryRoot, "modules")}/`))
      continue;
    const moduleName = directory.slice(join(repositoryRoot, "modules").length + 1);
    const expectedPath = `modules/${moduleName}/README.md`;
    if (tableEntries.get(manifest.name) !== expectedPath)
      failures.push(`${manifest.name}: missing or incorrect root README table entry`);
    if (!existsSync(join(repositoryRoot, expectedPath)))
      failures.push(`${manifest.name}: missing README`);
    const skillName = `nuxt-${moduleName}`;
    if (!existsSync(join(skillsDirectory, skillName, "SKILL.md")))
      failures.push(`${manifest.name}: missing skills/${skillName}/SKILL.md`);
  }

  return failures;
}

const failures = validateDocumentation();
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Module README and consumer skill coverage is valid.");
