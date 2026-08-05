/**
 * @fileoverview Reports whether publishable package versions are pending, published, or failed.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const afterPublish = process.argv.includes("--after");
const root = resolve(import.meta.dirname, "..");
for (const entry of readdirSync(join(root, "modules"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const packageFile = join(root, "modules", entry.name, "package.json");
  if (!existsSync(packageFile)) continue;
  const packageJson = JSON.parse(readFileSync(packageFile, "utf8"));
  if (packageJson.private === true) continue;
  const reference = `${packageJson.name}@${packageJson.version}`;
  const result = spawnSync(
    "npm",
    ["view", reference, "version", "--registry", "https://registry.npmjs.org"],
    { encoding: "utf8" }
  );
  const published = result.status === 0 && result.stdout.trim() === packageJson.version;
  console.log(
    `${published ? (afterPublish ? "published" : "already-published") : afterPublish ? "failed" : "pending"}: ${reference}`
  );
}
