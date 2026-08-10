import { createServer } from "node:http";
import { afterAll, describe, expect, it } from "vitest";
import { $fetch } from "@nuxt/test-utils/e2e";
import { setupFixture } from "../../../packages/test-utils/src";

describe("Directus client and server composables", async () => {
  const upstream = createServer((request, response) => {
    if (request.url?.startsWith("/items/pages")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "page-1" }] }));
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        errors: [{ message: "Not found", extensions: { code: "NOT_FOUND" } }]
      })
    );
  });

  const originalUrl = process.env.DIRECTUS_E2E_URL;
  await new Promise<void>((resolve, reject) => {
    upstream.once("error", reject);
    upstream.listen(0, "127.0.0.1", resolve);
  });

  const address = upstream.address();
  if (!address || typeof address === "string")
    throw new Error("Mock Directus server did not start");
  process.env.DIRECTUS_E2E_URL = `http://127.0.0.1:${address.port}`;

  await setupFixture(import.meta.url, "basic", { dev: false });

  afterAll(async () => {
    if (originalUrl === undefined) delete process.env.DIRECTUS_E2E_URL;
    else process.env.DIRECTUS_E2E_URL = originalUrl;
    await new Promise<void>((resolve, reject) => {
      upstream.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("executes useDirectusServer through Nitro", async () => {
    await expect(
      $fetch<{ count: number; firstId: string }>("/api/directus-server")
    ).resolves.toMatchObject({ count: 1, firstId: expect.any(String) });
  });

  it("executes useDirectus during SSR", async () => {
    const html = await $fetch<string>("/");
    expect(html).toContain('<p data-testid="client-ssr-count">1</p>');
    expect(html).toContain('<p data-testid="client-ssr-error"></p>');
  });
});
