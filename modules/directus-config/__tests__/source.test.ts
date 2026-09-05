import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  generateDirectusServerConfigDeclarationSource,
  generateDirectusServerConfigSource,
  getResolvedDirectusConfigFromSource,
  loadDirectusConfigSource,
  generateDirectusRuntimeConfigSource,
  resolveDirectusConfigFile
} from "../src/config/source";
import { directusConfigSchema } from "../src/schema";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("Directus config source discovery", () => {
  it("uses the proxy credential name without a static-token compatibility alias", () => {
    expect(directusConfigSchema.parse({ instance: { proxyToken: "proxy-token" } })).toMatchObject({
      instance: { proxyToken: "proxy-token" }
    });
    expect(() => directusConfigSchema.parse({ instance: { staticToken: "static-token" } })).toThrow(
      /Unrecognized key/
    );
  });

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
    await expect(loadDirectusConfigSource()).resolves.toEqual({ collections: [] });
  });

  it("loads a resolved source for dependency discovery", async () => {
    const root = mkdtempSync(join(tmpdir(), "nuxt-directus-config-"));
    directories.push(root);
    const configFile = join(root, "directus.config.ts");
    writeFileSync(
      configFile,
      "export default { client: { auth: { turnstile: { enabled: true } } } };"
    );

    await expect(getResolvedDirectusConfigFromSource(root, configFile)).resolves.toMatchObject({
      client: { auth: { turnstile: { enabled: true } } }
    });
    await expect(getResolvedDirectusConfigFromSource(root, false)).resolves.toBeUndefined();
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

  it("generates a client-safe virtual source from the resolved config", () => {
    const source = generateDirectusRuntimeConfigSource(
      directusConfigSchema.parse({
        instance: { baseUrl: "https://cms.example.test", proxyToken: "server-only-token" },
        client: { commands: ["readItems"] }
      })
    );

    expect(source).toContain('"client":{"proxy":{"path":"/_directus/proxy"}');
    expect(source).not.toContain("server-only-token");
    expect(source).not.toContain("directus.config.ts");
    expect(generateDirectusRuntimeConfigSource()).toBe("export default {};\n");
    expect(generateDirectusServerConfigSource("/project/directus.config.ts")).toContain(
      "validateDirectusConfig(config)"
    );
    expect(generateDirectusServerConfigSource()).toBe("export default {};\n");
  });

  it("generates a Nitro declaration for the server-only config module", () => {
    expect(generateDirectusServerConfigDeclarationSource()).toContain(
      'import type { ResolvedDirectusConfig } from "@onderwijsin/nuxt-directus-config/schema"'
    );
    expect(generateDirectusServerConfigDeclarationSource()).toContain("ResolvedDirectusConfig");
  });
});
