import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { discoverRedirectSources, generateRedirectsSourceRegistry } from "../src/config/sources";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("redirect source discovery", () => {
  it("discovers sources in lexicographic path order", () => {
    const directory = mkdtempSync(join(tmpdir(), "nuxt-redirects-"));
    directories.push(directory);
    writeFileSync(join(directory, "z.ts"), "export default () => []");
    writeFileSync(join(directory, "a.ts"), "export default () => []");

    expect(discoverRedirectSources(directory).map((source) => source.name)).toEqual([
      "a.ts",
      "z.ts"
    ]);
  });

  it("ignores declaration files", () => {
    const directory = mkdtempSync(join(tmpdir(), "nuxt-redirects-"));
    directories.push(directory);
    writeFileSync(join(directory, "redirects.d.ts"), "export {};");

    expect(discoverRedirectSources(directory)).toEqual([]);
  });

  it("generates a deterministic startup plugin", () => {
    const registry = generateRedirectsSourceRegistry([
      { name: "a.ts", path: "/project/server/redirects/a.ts" },
      { name: "z.ts", path: "/project/server/redirects/z.ts" }
    ]);

    expect(registry).toContain('import source0 from "/project/server/redirects/a.ts";');
    expect(registry).toContain('import source1 from "/project/server/redirects/z.ts";');
    expect(registry).not.toContain("nitropack/runtime");
    expect(registry).toContain("export default (nitroApp) => {");
    expect(registry).toContain('nitroApp.hooks.hook("redirects:sources", (context) => {');
    expect(registry).toContain("context.sources.push(source0, source1)");
  });
});
