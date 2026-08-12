/**
 * Determines the smallest safe package validation scope for a pull request.
 *
 * The detector fails closed: repository-wide validation is selected whenever a
 * changed path cannot be classified confidently.
 */

import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../..");
const outputFile = process.env.GITHUB_OUTPUT;
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function discoverPackages() {
  return ["packages", "modules"].flatMap((packageRoot) =>
    readdirSync(join(root, packageRoot), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const directory = join(root, packageRoot, entry.name);
        const packageFile = join(directory, "package.json");
        if (!existsSync(packageFile)) return [];
        const manifest = readJson(packageFile);
        const entries = [{ directory, manifest }];
        const playground = join(directory, "playground");
        const playgroundFile = join(playground, "package.json");
        if (existsSync(playgroundFile))
          entries.push({ directory: playground, manifest: readJson(playgroundFile) });
        return entries;
      })
  );
}

function changedFiles() {
  if (process.env.CHANGED_FILES) return process.env.CHANGED_FILES.split("\n").filter(Boolean);
  const base = process.env.GITHUB_BASE_SHA;
  if (!base) return null;
  return execFileSync(
    "git",
    ["diff", "--name-only", `${base}...${process.env.GITHUB_SHA || "HEAD"}`],
    {
      cwd: root,
      encoding: "utf8"
    }
  )
    .trim()
    .split("\n")
    .filter(Boolean);
}

function writeOutput(name, value) {
  if (!outputFile) return;
  const text = String(value);
  if (text.includes("\n")) {
    const delimiter = `ci_${name}`;
    appendFileSync(outputFile, `${name}<<${delimiter}\n${text}\n${delimiter}\n`);
  } else appendFileSync(outputFile, `${name}=${text}\n`);
}

const packages = discoverPackages();
const packageByName = new Map(packages.map((entry) => [entry.manifest.name, entry]));
const packageByDirectory = packages
  .map((entry) => ({ ...entry, path: relative(root, entry.directory) }))
  .sort((a, b) => b.path.length - a.path.length);
const changed = changedFiles();
const fullPathPatterns = [
  /^\.github\//u,
  /^scripts\//u,
  /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$/u,
  /^(?:tsconfig|vitest\.config|nuxt\.config|oxlint|oxfmt)[^.]*\./u
];
const documentationOnly = (files) =>
  files.length > 0 && files.every((file) => /^(?:docs\/|.*\.md$|\.changeset\/)/u.test(file));

let full =
  changed === null || changed.length === 0 || process.env.GITHUB_EVENT_NAME !== "pull_request";
let reason = full
  ? "No trustworthy pull-request diff is available."
  : "Changed package paths were classified.";
const affected = new Set();

if (!full) {
  if (documentationOnly(changed)) reason = "Documentation-only change.";
  else {
    for (const file of changed) {
      if (fullPathPatterns.some((pattern) => pattern.test(file))) {
        full = true;
        reason = `Full validation required for ${file}.`;
        break;
      }
      const match = packageByDirectory.find(
        (entry) => file === entry.path || file.startsWith(`${entry.path}/`)
      );
      if (!match) {
        full = true;
        reason = `Unclassified path requires full validation: ${file}.`;
        break;
      }
      affected.add(match.manifest.name);
      if (match.path.startsWith("modules/") && !match.path.endsWith("/playground")) {
        const playground = packageByDirectory.find(
          (entry) => entry.path === `${match.path}/playground`
        );
        if (playground) affected.add(playground.manifest.name);
      }
    }
  }
}

const dependencyFields = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies"
];
const dependents = new Map(packages.map((entry) => [entry.manifest.name, new Set()]));
for (const entry of packages) {
  for (const field of dependencyFields) {
    for (const dependency of Object.keys(entry.manifest[field] ?? {})) {
      if (packageByName.has(dependency)) dependents.get(dependency).add(entry.manifest.name);
    }
  }
}
for (let changedPackage = true; !full && changedPackage;) {
  changedPackage = false;
  for (const packageName of [...affected]) {
    for (const dependent of dependents.get(packageName) ?? []) {
      if (!affected.has(dependent)) {
        affected.add(dependent);
        changedPackage = true;
      }
    }
  }
}

const selected = full ? packages.map((entry) => entry.manifest.name) : [...affected].sort();
const selectedEntries = selected.map((name) => packageByName.get(name)).filter(Boolean);
const testPaths = selectedEntries
  .filter(
    (entry) =>
      !entry.directory.endsWith("/playground") && existsSync(join(entry.directory, "__tests__"))
  )
  .map((entry) => relative(root, join(entry.directory, "__tests__")));

writeOutput("full", full);
writeOutput("reason", reason);
writeOutput("packages", selected.join(" "));
writeOutput("test_paths", testPaths.join(" "));

if (summaryFile)
  appendFileSync(
    summaryFile,
    `### CI validation scope\n\n- Scope: **${full ? "full" : "focused"}**\n- Reason: ${reason}\n- Packages: ${selected.length ? selected.join(", ") : "none"}\n`
  );
