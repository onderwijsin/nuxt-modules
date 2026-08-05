import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = join(root, "release", "packages");
mkdirSync(output, { recursive: true });
for (const entry of readdirSync(join(root, "modules"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const directory = join(root, "modules", entry.name);
  const packageFile = join(directory, "package.json");
  if (!existsSync(packageFile)) continue;
  const packageJson = JSON.parse(readFileSync(packageFile, "utf8"));
  if (packageJson.private === true) continue;
  const packageOutput = join(output, entry.name);
  mkdirSync(packageOutput, { recursive: true });
  cpSync(packageFile, join(packageOutput, "package.json"));
  for (const file of ["CHANGELOG.md", "README.md"]) {
    if (existsSync(join(directory, file))) cpSync(join(directory, file), join(packageOutput, file));
  }
}
