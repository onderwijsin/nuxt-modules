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

const moduleEntry = spawnSync("tar", ["-xOzf", archive, "package/dist/module.mjs"], {
  encoding: "utf8"
});
if (
  moduleEntry.status !== 0 ||
  /from\s+["'](?:module-utils|test-utils)["']/.test(moduleEntry.stdout)
) {
  console.error("Packed package is missing its entrypoint or leaks a private workspace import.");
  process.exit(1);
}
console.log(`Packed package is self-contained: ${archive}`);
