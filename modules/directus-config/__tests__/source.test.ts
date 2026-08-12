import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  generateDirectusServerConfigDeclarationSource,
  generateDirectusServerConfigSource,
  loadDirectusConfigSource,
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
    expect(resolveDirectusConfigFile(root, "missing.ts")).toBeUndefined();
    expect(resolveDirectusConfigFile(root, join(root, "directus.config.ts"))).toBe(
      join(root, "directus.config.ts")
    );
  });

  it("loads executable TypeScript config and applies schema defaults", async () => {
    const root = mkdtempSync(join(tmpdir(), "nuxt-directus-config-"));
    directories.push(root);
    const configFile = join(root, "directus.config.ts");
    writeFileSync(
      configFile,
      'export default { instance: { baseUrl: "https://cms.example.test" }, client: { preview: {} } };'
    );

    await expect(loadDirectusConfigSource(configFile)).resolves.toMatchObject({
      instance: { baseUrl: "https://cms.example.test" },
      client: { proxy: { path: "/_directus/proxy" }, preview: { enabled: true } }
    });
    await expect(loadDirectusConfigSource()).resolves.toEqual({});
  });

  it("rejects invalid executable config sources", async () => {
    const root = mkdtempSync(join(tmpdir(), "nuxt-directus-config-"));
    directories.push(root);
    const configFile = join(root, "directus.config.ts");
    writeFileSync(configFile, 'export default { instance: { baseUrl: "invalid" } };');

    await expect(loadDirectusConfigSource(configFile)).rejects.toThrow(
      "Invalid directus.config.ts configuration."
    );
  });

  it("generates a validated virtual source", () => {
    expect(generateDirectusRuntimeConfigSource("/project/directus.config.ts")).toContain(
      "directusPublicConfigSchema.parse(directusConfigSchema.parse(config))"
    );
    expect(generateDirectusRuntimeConfigSource()).toBe("export default {};\n");
    expect(generateDirectusServerConfigSource("/project/directus.config.ts")).toContain(
      "validateDirectusConfig(config)"
    );
    expect(generateDirectusServerConfigSource()).toBe("export default {};\n");
  });

  it("generates a Nitro declaration for the server-only config module", () => {
    expect(generateDirectusServerConfigDeclarationSource()).toContain(
      "import type { ResolvedDirectusConfig }"
    );
    expect(generateDirectusServerConfigDeclarationSource()).toContain("ResolvedDirectusConfig");
  });
});
