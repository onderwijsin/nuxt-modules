/**
 * @fileoverview Verifies that a packed package contains only intended files and no private imports.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { containsPackageImport, discoverPrivateWorkspacePackages } from "./package-validation.mjs";

const archive = process.argv[2];
if (!archive || !existsSync(archive)) {
  console.error("Usage: node scripts/check-packed-package.mjs <package.tgz>");
  process.exit(1);
}

const listing = spawnSync("tar", ["-tzf", archive], { encoding: "utf8" });
if (listing.status !== 0) {
  console.error(listing.stderr);
  process.exit(listing.status ?? 1);
}
for (const entry of listing.stdout.trim().split("\n").filter(Boolean)) {
  if (
    !entry.startsWith("package/dist/") &&
    ![
      "package/",
      "package/package.json",
      "package/README.md",
      "package/CHANGELOG.md",
      "package/LICENSE"
    ].includes(entry)
  ) {
    console.error(`Unexpected packed file: ${entry}`);
    process.exit(1);
  }
}

const extractedDirectory = mkdtempSync(join(tmpdir(), "nuxt-package-check-"));
const extraction = spawnSync("tar", ["-xzf", archive, "-C", extractedDirectory], {
  encoding: "utf8"
});
if (extraction.status !== 0) {
  console.error(extraction.stderr);
  rmSync(extractedDirectory, { recursive: true, force: true });
  process.exit(extraction.status ?? 1);
}
const packageJson = JSON.parse(
  readFileSync(join(extractedDirectory, "package/package.json"), "utf8")
);
const entrypoint = packageJson?.main?.replace(/^\.\//u, "") ?? "dist/module.mjs";
const privatePackages = discoverPrivateWorkspacePackages();
const outputEntries = listing.stdout
  .trim()
  .split("\n")
  .filter((entry) => /\.(?:[cm]?js|[cm]?ts)$/u.test(entry));
const output = outputEntries
  .map((entry) => readFileSync(join(extractedDirectory, entry), "utf8"))
  .find((source) =>
    [...privatePackages].some((privatePackage) => containsPackageImport(source, privatePackage))
  );
const packageEntryPath = join(extractedDirectory, "package", entrypoint);
const packageEntry = existsSync(packageEntryPath) ? readFileSync(packageEntryPath, "utf8") : null;
if (output || packageEntry === null || /createJiti\(import\.meta\.url/u.test(packageEntry)) {
  console.error(
    "Packed package is missing its entrypoint, contains an unbuilt Nuxt module stub, or leaks a private workspace import."
  );
  process.exit(1);
}
rmSync(extractedDirectory, { recursive: true, force: true });
console.log(`Packed package is self-contained: ${archive}`);
