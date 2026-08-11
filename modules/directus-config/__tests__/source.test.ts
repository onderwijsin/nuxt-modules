import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  generateDirectusServerConfigDeclarationSource,
  generateDirectusRuntimeConfigSource,
  resolveDirectusConfigFile
} from "../src/config/source";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("Directus config source discovery", () => {
  it("discovers a root-relative config source when it exists", () => {
    const root = mkdtempSync(join(tmpdir(), "nuxt-directus-config-"));
    directories.push(root);
    writeFileSync(join(root, "directus.config.ts"), "export default {};");

    expect(resolveDirectusConfigFile(root, "directus.config.ts")).toBe(
      join(root, "directus.config.ts")
    );
    expect(resolveDirectusConfigFile(root, false)).toBeUndefined();
  });

  it("generates a validated virtual source", () => {
    expect(generateDirectusRuntimeConfigSource("/project/directus.config.ts")).toContain(
      "directusPublicConfigSchema.parse(directusConfigSchema.parse(config))"
    );
  });

  it("generates a Nitro declaration for the server-only config module", () => {
    expect(generateDirectusServerConfigDeclarationSource()).toContain(
      "import type { ResolvedDirectusConfig }"
    );
    expect(generateDirectusServerConfigDeclarationSource()).toContain("ResolvedDirectusConfig");
  });
});
