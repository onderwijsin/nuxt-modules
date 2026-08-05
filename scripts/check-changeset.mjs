import { existsSync, readFileSync } from "node:fs";

const eventFile = process.env.GITHUB_EVENT_PATH;
const event = eventFile && existsSync(eventFile) ? JSON.parse(readFileSync(eventFile, "utf8")) : {};
const hasExemption = (event.pull_request?.labels ?? []).some(
  (label) => label.name === "no-changeset"
);
const hasChangeset = process.argv
  .slice(2)
  .some(
    (file) =>
      file.startsWith(".changeset/") && file.endsWith(".md") && file !== ".changeset/README.md"
  );
if (!hasChangeset && !hasExemption) {
  console.error("This change needs a changeset or the no-changeset pull request label.");
  process.exit(1);
}
console.log(hasChangeset ? "Changeset found." : "Accepted by the no-changeset label.");
