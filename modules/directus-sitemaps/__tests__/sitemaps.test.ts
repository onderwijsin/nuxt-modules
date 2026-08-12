import { describe, expect, it } from "vitest";

import { resolveNamespacedSitemapRoute, resolveSitemapNamespaces } from "../src/utils/helpers";

describe("Directus sitemap configuration", () => {
  it("resolves unique namespaces from collections and static entries", () => {
    expect(
      resolveSitemapNamespaces({
        enabled: true,
        collections: [
          { collection: "articles", sitemap: { _sitemap: "content" }, prerender: false },
          { collection: "pages", sitemap: { _sitemap: "content" }, prerender: false },
          { collection: "excluded", sitemap: false, prerender: false }
        ],
        static: [{ loc: "/about", _sitemap: "static" }],
        apiEndpoint: "/api/source",
        sitemapsPathPrefix: "/__sitemap__/",
        enablePrettyUrls: true,
        cache: false,
        prerenderSitemaps: false
      })
    ).toEqual(["content", "static"]);
  });

  it("joins a namespace to the configured sitemap path prefix", () => {
    expect(resolveNamespacedSitemapRoute("articles", "/custom-sitemaps/")).toBe(
      "/custom-sitemaps/articles.xml"
    );
  });
});
