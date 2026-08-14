/**
 * @fileoverview Verifies that a packed package contains only intended files and no private imports.
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

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

const packageJsonOutput = spawnSync("tar", ["-xOzf", archive, "package/package.json"], {
  encoding: "utf8"
});
const packageJson = packageJsonOutput.status === 0 ? JSON.parse(packageJsonOutput.stdout) : null;
const entrypoint = packageJson?.main?.replace(/^\.\//u, "") ?? "dist/module.mjs";
const packageEntry = spawnSync("tar", ["-xOzf", archive, `package/${entrypoint}`], {
  encoding: "utf8"
});
if (
  packageEntry.status !== 0 ||
  /from\s+["']test-utils(?:\/[^"']*)?["']/.test(packageEntry.stdout) ||
  /createJiti\(import\.meta\.url/u.test(packageEntry.stdout)
) {
  console.error(
    "Packed package is missing its entrypoint, contains an unbuilt Nuxt module stub, or leaks a private workspace import."
  );
  process.exit(1);
}
console.log(`Packed package is self-contained: ${archive}`);
