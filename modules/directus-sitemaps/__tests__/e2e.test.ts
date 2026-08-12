import { createServer } from "node:http";

import { afterAll, describe, expect, it } from "vitest";
import { $fetch, fetch, url } from "@nuxt/test-utils/e2e";
import { setupFixture } from "../../../packages/test-utils/src";

describe("directus-sitemaps endpoints", async () => {
  const upstreamRequests: string[] = [];
  const upstream = createServer((request, response) => {
    upstreamRequests.push(request.url ?? "");
    if (request.url?.startsWith("/items/articles")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          data: [
            { slug: "published", updated_at: "2026-08-01T10:00:00.000Z" },
            { slug: "private", updated_at: "2026-08-02T10:00:00.000Z" }
          ]
        })
      );
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ errors: [{ message: "Not found" }] }));
  });
  const originalUrl = process.env.DIRECTUS_SITEMAPS_E2E_URL;

  await new Promise<void>((resolve, reject) => {
    upstream.once("error", reject);
    upstream.listen(0, "127.0.0.1", resolve);
  });
  const address = upstream.address();
  if (!address || typeof address === "string") {
    throw new Error("Mock Directus server did not start");
  }
  process.env.DIRECTUS_SITEMAPS_E2E_URL = `http://127.0.0.1:${address.port}`;

  await setupFixture(import.meta.url, "basic", { dev: false });

  afterAll(async () => {
    if (originalUrl === undefined) delete process.env.DIRECTUS_SITEMAPS_E2E_URL;
    else process.env.DIRECTUS_SITEMAPS_E2E_URL = originalUrl;
    await new Promise<void>((resolve, reject) => {
      upstream.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("returns mapped Directus URLs, custom-fetcher URLs, and static entries", async () => {
    await expect($fetch("/api/sitemap-source")).resolves.toEqual([
      {
        loc: "/articles/published",
        lastmod: "2026-08-01T10:00:00.000Z",
        _sitemap: "articles"
      },
      { loc: "/custom-page", _sitemap: "pages" },
      { loc: "/about", changefreq: "monthly" }
    ]);
    expect(upstreamRequests).toContainEqual(expect.stringContaining("/items/articles"));
  });

  it("filters dynamic URLs and can omit static entries", async () => {
    await expect(
      $fetch("/api/sitemap-source?collection=articles&includeStatic=false")
    ).resolves.toEqual([
      {
        loc: "/articles/published",
        lastmod: "2026-08-01T10:00:00.000Z",
        _sitemap: "articles"
      }
    ]);
    await expect($fetch("/api/sitemap-source?collection=excluded")).resolves.toEqual([
      { loc: "/about", changefreq: "monthly" }
    ]);
  });

  it("returns a client error for invalid source query parameters", async () => {
    const response = await fetch(url("/api/sitemap-source?includeStatic=not-a-boolean"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      statusMessage: "Invalid sitemap query"
    });
  });

  it("routes entries to separate named sitemap endpoints", async () => {
    const redirect = await fetch(url("/sitemap"), { redirect: "manual" });

    expect(redirect.status).toBe(301);
    expect(redirect.headers.get("location")).toBe("/sitemap_index.xml");
    await expect($fetch<string>("/sitemap_index.xml")).resolves.toContain("articles.xml");
    await expect($fetch<string>("/__sitemap__/articles.xml")).resolves.toContain(
      "/articles/published"
    );
    await expect($fetch<string>("/__sitemap__/articles.xml")).resolves.not.toContain(
      "/custom-page"
    );
    await expect($fetch<string>("/__sitemap__/pages.xml")).resolves.toContain("/custom-page");
  });
});
