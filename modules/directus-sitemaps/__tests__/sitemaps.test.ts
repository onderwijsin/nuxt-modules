import { describe, expect, it } from "vitest";

import { createSitemapSource } from "../src/utils/sitemaps";

describe("Directus sitemap configuration", () => {
  it("creates one generic source for @nuxtjs/sitemap", () => {
    expect(createSitemapSource("/api/sitemap-source")).toEqual(["/api/sitemap-source"]);
  });
});
