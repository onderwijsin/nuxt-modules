import { describe, expect, it } from "vitest";

import { createSitemapSources, getSitemapKeys } from "../src/utils/sitemaps";

describe("directus sitemap configuration", () => {
  it("creates one source per configured sitemap name", () => {
    const keys = getSitemapKeys(
      [
        { collection: "pages", sitemap: "pages" },
        { collection: "articles", sitemap: "articles" }
      ],
      [{ loc: "/about", _sitemap: "pages" }]
    );

    expect(keys).toEqual(["pages", "articles"]);
    expect(createSitemapSources(keys, "/api/sitemap-source")).toEqual({
      pages: { sources: ["/api/sitemap-source"] },
      articles: { sources: ["/api/sitemap-source"] }
    });
  });
});
