import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { discoverHealthcheckComponents } from "../src/config/components";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function createComponent(name: string, source: string): string {
  const directory = mkdtempSync(join(tmpdir(), "nuxt-healthcheck-"));
  directories.push(directory);
  writeFileSync(join(directory, name), source);
  return directory;
}

describe("healthcheck component discovery", () => {
  it("discovers valid default component exports", () => {
    const directory = createComponent(
      "database.ts",
      "export default defineHealthcheckComponent({ handler: async () => ({}) })"
    );

    expect(discoverHealthcheckComponents(directory)).toEqual([
      { name: "database", path: join(directory, "database.ts") }
    ]);
  });

  it("defers export-shape validation until the imported component is normalized", () => {
    const directory = createComponent(
      "database.ts",
      "export default { handler: async () => ({}) }"
    );
    expect(discoverHealthcheckComponents(directory)).toEqual([
      { name: "database", path: join(directory, "database.ts") }
    ]);
  });

  it("rejects names that collide with built-ins", () => {
    const directory = createComponent(
      "cache.ts",
      "export default defineHealthcheckComponent({ handler: async () => ({}) })"
    );
    expect(() => discoverHealthcheckComponents(directory)).toThrow(/cannot be overridden/);
  });
});
