import { $fetch, setup } from "@nuxt/test-utils/e2e";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

await setup({
  rootDir: fileURLToPath(new URL("./fixtures/aliases", import.meta.url)),
  server: true
});

describe("directus-config virtual aliases", () => {
  it("exposes only the sanitized configuration through the client-safe alias", async () => {
    await expect($fetch("/api/public-config")).resolves.toEqual({
      client: {
        proxy: { path: "/_cms" },
        preview: {
          enabled: true,
          versioning: true,
          queryKeys: { preview: "preview", token: "token", version: "version", id: "id" }
        },
        auth: { enabled: true, turnstile: { enabled: true } }
      }
    });
  });

  it("keeps credentials and executable configuration in the server-only alias", async () => {
    await expect($fetch("/api/server-config")).resolves.toMatchObject({
      instance: {
        baseUrl: "https://cms.example.test",
        staticToken: "server-only-static-token"
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
