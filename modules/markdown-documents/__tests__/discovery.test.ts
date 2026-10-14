import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  generateDocumentRegistry,
  isDefinitionWatchPath,
  resolveDefinitionDirectory
} from "../src/config/definitions";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** Creates a temporary consumer root for discovery tests.
 * @returns The temporary root path.
 */
function createRoot() {
  const root = mkdtempSync(join(tmpdir(), "markdown-documents-"));
  roots.push(root);
  return root;
}

describe("document discovery", () => {
  it("allows an absent default directory but rejects an explicitly missing directory", () => {
    const root = createRoot();
    const path = resolveDefinitionDirectory(root, "server/documents", false);
    expect(generateDocumentRegistry(path, "/runtime/registry")).toContain(
      "validateDocumentDefinitions(["
    );
    expect(() => resolveDefinitionDirectory(root, "custom/documents", true)).toThrow(
      /does not exist/
    );
    writeFileSync(join(root, "not-a-directory"), "export default {}");
    expect(() => resolveDefinitionDirectory(root, "not-a-directory", true)).toThrow(
      /not a directory/
    );
  });

  it("discovers nested sources deterministically and ignores declaration files", () => {
    const root = createRoot();
    mkdirSync(join(root, "nested"));
    writeFileSync(join(root, "z.ts"), "export default {}");
    writeFileSync(join(root, "nested/a.ts"), "export default {}");
    writeFileSync(join(root, "types.d.ts"), "export {}");
    const registry = generateDocumentRegistry(root, "/runtime/registry");
    expect(registry.indexOf("nested/a.ts")).toBeLessThan(registry.indexOf("z.ts"));
    expect(registry).not.toContain("types.d.ts");
    expect(registry).toContain("definition: document0");
    expect(registry).not.toContain("#build");
  });

  it("regenerates membership after source addition/removal and scopes watch paths", () => {
    const root = createRoot();
    const file = join(root, "one.ts");
    expect(generateDocumentRegistry(root, "/runtime/registry")).not.toContain("document0");
    writeFileSync(file, "export default {}");
    expect(generateDocumentRegistry(root, "/runtime/registry")).toContain("one.ts");
    rmSync(file);
    expect(generateDocumentRegistry(root, "/runtime/registry")).not.toContain("one.ts");
    expect(isDefinitionWatchPath(root, file)).toBe(true);
    expect(isDefinitionWatchPath(root, join(root, "types.d.ts"))).toBe(false);
    expect(isDefinitionWatchPath(root, `${root}-neighbor/one.ts`)).toBe(false);
  });
});
