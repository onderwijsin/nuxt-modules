/**
 * Selects the smallest safe CI validation scope for a pull request.
 *
 * The script fails closed: if it cannot confidently classify a change, it
 * selects the full repository validation path.
 */

import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputFile = process.env.GITHUB_OUTPUT;
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

/** @typedef {{ name: string, private?: boolean, [key: string]: unknown }} PackageManifest */
/** @typedef {{ directory: string, path: string, manifest: PackageManifest }} WorkspacePackage */
/** @typedef {{ full: boolean, reason: string, direct: Set<string> }} ChangeClassification */

/**
 * Reads and parses a JSON file.
 *
 * @param {string} filePath Absolute path to the JSON file.
 * @returns {PackageManifest} Parsed package manifest.
 */
function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

/**
 * Finds workspace packages and their private playground packages.
 *
 * @returns {Array<{ directory: string, manifest: PackageManifest }>} Discovered packages.
 */
function discoverPackages() {
  return ["packages", "modules"].flatMap((packageRoot) => {
    // Only these two roots are package sources; playgrounds are discovered below their module.
    return readdirSync(join(root, packageRoot), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const directory = join(root, packageRoot, entry.name);
        const packageFile = join(directory, "package.json");
        if (!existsSync(packageFile)) return [];

        const entries = [{ directory, manifest: readJson(packageFile) }];
        const playgroundFile = join(directory, "playground", "package.json");
        if (existsSync(playgroundFile)) {
          entries.push({
            directory: join(directory, "playground"),
            manifest: readJson(playgroundFile)
          });
        }
        return entries;
      });
  });
}

/**
 * Gets changed paths from the test override or from the GitHub comparison.
 *
 * @returns {string[] | null} Changed repository-relative paths, or null when unavailable.
 */
function getChangedFiles() {
  // The override makes the detector easy to exercise locally without GitHub environment values.
  if (process.env.CHANGED_FILES) return process.env.CHANGED_FILES.split("\n").filter(Boolean);

  const baseSha = process.env.GITHUB_BASE_SHA;
  if (!baseSha) return null;

  const diff = execFileSync(
    "git",
    ["diff", "--name-only", `${baseSha}...${process.env.GITHUB_SHA || "HEAD"}`],
    { cwd: root, encoding: "utf8" }
  );
  return diff.trim().split("\n").filter(Boolean);
}

/**
 * Writes a value to GitHub Actions step outputs when running in Actions.
 *
 * @param {string} name Output name.
 * @param {string | boolean} value Output value.
 * @returns {void}
 */
function writeGithubOutput(name, value) {
  if (!outputFile) return;

  const text = String(value);
  if (text.includes("\n")) {
    const delimiter = `ci_${name}`;
    appendFileSync(outputFile, `${name}<<${delimiter}\n${text}\n${delimiter}\n`);
    return;
  }
  appendFileSync(outputFile, `${name}=${text}\n`);
}

/**
 * Formats a collection as a readable indented list for logs and summaries.
 *
 * @param {string[]} items Items to format.
 * @param {string} empty Fallback text for an empty collection.
 * @returns {string} Formatted list.
 */
function formatList(items, empty = "none") {
  return items.length ? items.map((item) => `  • ${item}`).join("\n") : `  • ${empty}`;
}

/**
 * Determines whether every changed path is documentation-only.
 *
 * @param {string[]} files Changed repository-relative paths.
 * @returns {boolean} Whether the change needs no package validation.
 */
function isDocumentationOnly(files) {
  return files.length > 0 && files.every((file) => /^(?:docs\/|.*\.md$|\.changeset\/)/u.test(file));
}

/**
 * Determines whether a changed path is intentionally excluded from full validation detection.
 *
 * @param {string} file Repository-relative changed path.
 * @returns {boolean} Whether the path should not select full validation.
 */
function isIgnoredForFullValidation(file) {
  const ignoredDirectory =
    /^(?:\.agents|\.artifacts|\.changeset|\.codex|\.husky|\.vscode|docs|skills)(?:\/|$)/u;
  const ignoredGithubPath = /^(?:\.github\/actions(?:\/|$)|\.github\/dependabot\.yml$)/u;
  const rootExceptions = new Set([
    ".npmrc",
    ".nvmrc",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tsconfig.json",
    "vitest.config.ts"
  ]);

  return (
    ignoredDirectory.test(file) ||
    ignoredGithubPath.test(file) ||
    (!file.includes("/") && !rootExceptions.has(file))
  );
}

/**
 * Classifies changed paths and records directly affected packages.
 *
 * @param {string[] | null} changed Changed repository-relative paths.
 * @param {WorkspacePackage[]} packages Discovered workspace packages.
 * @returns {ChangeClassification} Initial validation classification.
 */
function classifyChanges(changed, packages) {
  const packageByDirectory = packages
    .map((entry) => ({ ...entry, path: relative(root, entry.directory) }))
    .sort((a, b) => b.path.length - a.path.length);
  const direct = new Set();
  const fullPathPatterns = [
    /^\.github\//u,
    /^scripts\//u,
    /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$/u,
    /^(?:tsconfig|vitest\.config|nuxt\.config|oxlint|oxfmt)[^.]*\./u
  ];

  // Merge queues and manual runs do not provide a pull-request diff, so they always run fully.
  let full =
    changed === null || changed.length === 0 || process.env.GITHUB_EVENT_NAME !== "pull_request";
  let reason = full
    ? "No trustworthy pull-request diff is available."
    : "Changed package paths were classified.";

  const relevantChanged = (changed ?? []).filter((file) => !isIgnoredForFullValidation(file));

  if (full || relevantChanged.length === 0 || isDocumentationOnly(relevantChanged)) {
    if (!full && relevantChanged.length === 0) reason = "Ignored paths only.";
    else if (!full) reason = "Documentation-only change.";
    return { full, reason, direct };
  }

  for (const file of relevantChanged) {
    // Root tooling and unrecognized paths can affect every package, so fail closed.
    if (fullPathPatterns.some((pattern) => pattern.test(file))) {
      return {
        full: true,
        reason: `Full validation required for ${file}.`,
        direct
      };
    }

    const match = packageByDirectory.find(
      (entry) => file === entry.path || file.startsWith(`${entry.path}/`)
    );
    if (!match) {
      return {
        full: true,
        reason: `Unclassified path requires full validation: ${file}.`,
        direct
      };
    }

    direct.add(match.manifest.name);

    // A module change also needs its playground because it is the supported integration consumer.
    if (match.path.startsWith("modules/") && !match.path.endsWith("/playground")) {
      const playground = packageByDirectory.find(
        (entry) => entry.path === `${match.path}/playground`
      );
      if (playground) direct.add(playground.manifest.name);
    }
  }

  return { full: false, reason, direct };
}

/**
 * Builds a reverse workspace dependency graph.
 *
 * @param {WorkspacePackage[]} packages Discovered workspace packages.
 * @returns {Map<string, Set<string>>} Package name to packages that depend on it.
 */
function buildDependentGraph(packages) {
  const packageNames = new Set(packages.map((entry) => entry.manifest.name));
  const graph = new Map(packages.map((entry) => [entry.manifest.name, new Set()]));
  const dependencyFields = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies"
  ];

  for (const entry of packages) {
    for (const field of dependencyFields) {
      for (const dependency of Object.keys(entry.manifest[field] ?? {})) {
        if (packageNames.has(dependency)) graph.get(dependency).add(entry.manifest.name);
      }
    }
  }
  return graph;
}

/**
 * Adds all transitive workspace dependents to the selected package set.
 *
 * @param {Set<string>} selected Initially affected package names.
 * @param {Map<string, Set<string>>} graph Reverse workspace dependency graph.
 * @returns {Set<string>} Packages added because they depend on an affected package.
 */
function addDependents(selected, graph) {
  const added = new Set();
  let foundNewDependent = true;

  // Repeat until a fixed point so dependencies several levels deep are included.
  while (foundNewDependent) {
    foundNewDependent = false;
    for (const packageName of [...selected]) {
      for (const dependent of graph.get(packageName) ?? []) {
        if (selected.has(dependent)) continue;
        selected.add(dependent);
        added.add(dependent);
        foundNewDependent = true;
      }
    }
  }
  return added;
}

/**
 * Finds test directories belonging to selected non-playground packages.
 *
 * @param {string[]} selected Package names selected for validation.
 * @param {Map<string, WorkspacePackage>} packageByName Packages indexed by name.
 * @returns {string[]} Repository-relative test directories.
 */
function getTestPaths(selected, packageByName) {
  return selected
    .map((name) => packageByName.get(name))
    .filter((entry) => entry && !entry.directory.endsWith("/playground"))
    .filter((entry) => existsSync(join(entry.directory, "__tests__")))
    .map((entry) => relative(root, join(entry.directory, "__tests__")));
}

/**
 * Prints the detector result in a human-readable GitHub Actions log.
 *
 * @param {object} result Detection result.
 * @param {boolean} result.full Whether full validation was selected.
 * @param {string} result.reason Why the scope was selected.
 * @param {string[] | null} result.changed Changed paths.
 * @param {Set<string>} result.direct Directly affected packages.
 * @param {Set<string>} result.dependent Dependents added by the graph.
 * @param {string[]} result.selected Final package selection.
 * @param {string[]} result.testPaths Final test path selection.
 * @returns {void}
 */
function logResults({ full, reason, changed, direct, dependent, selected, testPaths }) {
  const icon = full ? "🛡️" : "🎯";
  const source = changed === null ? "unavailable" : `${changed.length} file(s)`;

  console.log(`\n${icon} CI validation scope: ${full ? "FULL" : "FOCUSED"}`);
  console.log("═".repeat(56));
  console.log(`📌 Reason: ${reason}`);
  console.log(`📂 Changed files: ${source}`);
  console.log(`📦 Selected packages: ${selected.length}`);
  console.log(`🧪 Selected test paths: ${testPaths.length}`);
  console.log(
    "\n📝 Changed paths\n" + formatList(changed ?? [], "diff unavailable; validation fails closed")
  );
  console.log("\n🎯 Directly affected packages\n" + formatList([...direct].sort()));
  console.log("\n🔗 Dependent packages added\n" + formatList([...dependent].sort()));
  console.log("\n📦 Validation packages\n" + formatList(selected));
  console.log("\n🧪 Test paths\n" + formatList(testPaths));
  console.log("═".repeat(56));
}

/**
 * Writes the detector result to the GitHub Actions job summary.
 *
 * @param {object} result Detection result.
 * @param {boolean} result.full Whether full validation was selected.
 * @param {string} result.reason Why the scope was selected.
 * @param {string[] | null} result.changed Changed paths.
 * @param {Set<string>} result.direct Directly affected packages.
 * @param {Set<string>} result.dependent Dependents added by the graph.
 * @param {string[]} result.selected Final package selection.
 * @param {string[]} result.testPaths Final test path selection.
 * @returns {void}
 */
function writeSummary({ full, reason, changed, direct, dependent, selected, testPaths }) {
  if (!summaryFile) return;

  appendFileSync(
    summaryFile,
    `### ${full ? "🛡️" : "🎯"} CI validation scope: ${full ? "full" : "focused"}\n\n` +
      `| Result | Value |\n| --- | --- |\n| Reason | ${reason} |\n| Changed files | ${changed?.length ?? "unavailable"} |\n| Direct packages | ${direct.size} |\n| Dependent packages | ${dependent.size} |\n| Selected packages | ${selected.length} |\n| Test paths | ${testPaths.length} |\n\n` +
      `#### 📦 Validation packages\n\n${formatList(selected)}\n\n` +
      `#### 🧪 Test paths\n\n${formatList(testPaths)}\n`
  );
}

/**
 * Runs change detection and publishes its results for the CI workflow.
 *
 * @returns {void}
 */
function main() {
  const discovered = discoverPackages();
  const packageByName = new Map(discovered.map((entry) => [entry.manifest.name, entry]));
  const changed = getChangedFiles();
  const classification = classifyChanges(changed, discovered);
  const direct = new Set(classification.direct);
  const selectedPackages = new Set(direct);
  const dependent = classification.full
    ? new Set()
    : addDependents(selectedPackages, buildDependentGraph(discovered));
  const selected = classification.full
    ? discovered.map((entry) => entry.manifest.name)
    : [...selectedPackages].sort();
  const testPaths = getTestPaths(selected, packageByName);
  const result = {
    full: classification.full,
    reason: classification.reason,
    changed,
    direct: classification.direct,
    dependent,
    selected,
    testPaths
  };

  writeGithubOutput("full", classification.full);
  writeGithubOutput("reason", classification.reason);
  writeGithubOutput("packages", selected.join(" "));
  writeGithubOutput("test_paths", testPaths.join(" "));
  logResults(result);
  writeSummary(result);
}

main();
