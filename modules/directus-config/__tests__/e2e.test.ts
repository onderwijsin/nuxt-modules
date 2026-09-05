import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { $fetch, setup, useTestContext } from "../../../packages/test-utils/src";

await setup({
  rootDir: fileURLToPath(new URL("./fixtures/aliases", import.meta.url)),
  server: true
});

function readFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? readFiles(path) : [readFileSync(path, "utf8")];
  });
}

describe("directus-config virtual aliases", () => {
  it("does not expose server-only configuration in the client bundle", () => {
    const nuxt = useTestContext().nuxt;
    if (!nuxt) throw new Error("Nuxt test context is unavailable");

    const nitroOutput = nuxt.options.nitro.output;
    if (!nitroOutput) throw new Error("Nuxt Nitro output configuration is unavailable");

    const outputDir = nitroOutput.dir;
    if (!outputDir) throw new Error("Nuxt test output directory is unavailable");

    const clientBundle = readFiles(join(outputDir, "public/_nuxt")).join("\n");

    expect(clientBundle).not.toContain("server-only-proxy-token");
    expect(clientBundle).not.toContain("server-only-introspection-token");
  });

  it("exposes only the sanitized configuration through the client-safe alias", async () => {
    await expect($fetch("/api/public-config")).resolves.toEqual({
      client: {
        proxy: { path: "/_cms" },
        assets: { enabled: true, path: "/_directus/assets" },
        preview: {
          enabled: true,
          versioning: true,
          queryKeys: { preview: "preview", token: "token", version: "version", id: "id" }
        },
        auth: {
          enabled: true,
          magicLinks: { enabled: false },
          turnstile: { enabled: true },
          maskSecretsInPlayground: true
        }
      }
    });
  });

  it("keeps credentials and executable configuration in the server-only alias", async () => {
    await expect($fetch("/api/server-config")).resolves.toMatchObject({
      instance: {
        baseUrl: "https://cms.example.test",
        proxyToken: "server-only-proxy-token"
      },
      client: {
        commands: ["readItems"],
        typegen: { introspectionToken: "server-only-introspection-token" },
        auth: { cookie: { name: "cms_session" } }
      },
      collections: [{ collection: "articles" }],
      sitemaps: { apiEndpoint: "/api/sitemap-source", prerenderSitemaps: true }
    });
  });
});
