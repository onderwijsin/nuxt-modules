import { beforeEach, describe, expect, it, vi } from "vitest";

const useDirectusServer = vi.fn();

vi.mock("#imports", () => ({ useDirectusServer }));

const { buildSitemapUrls, getCollectionUrls } = await import("../src/runtime/server/utils/urls");

describe("Directus sitemap URLs", () => {
  beforeEach(() => {
    useDirectusServer.mockReset();
  });

  it("maps indexable Directus records and excludes no-index records", async () => {
    useDirectusServer.mockResolvedValue([
      {
        slug: "hello",
        date_updated: "2026-08-01T10:00:00.000Z",
        seo: { sitemap: { changefreq: "weekly", priority: "0.8" } }
      },
      { slug: "private", seo: { no_index: true } },
      { date_created: "2026-08-02T10:00:00.000Z" }
    ]);

    await expect(
      getCollectionUrls(
        undefined,
        { collection: "articles", sitemap: "articles", pathPrefix: "/blog" },
        "build-date"
      )
    ).resolves.toEqual([
      {
        loc: "/blog/hello",
        lastmod: "2026-08-01T10:00:00.000Z",
        changefreq: "weekly",
        priority: 0.8,
        _sitemap: "articles"
      }
    ]);
  });

  it("preserves static entries when a collection cannot be fetched", async () => {
    useDirectusServer.mockRejectedValue(new Error("Directus unavailable"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      buildSitemapUrls(
        undefined,
        [{ collection: "articles", sitemap: "articles" }],
        [{ loc: "/about", _sitemap: "pages" }]
      )
    ).resolves.toEqual([{ loc: "/about", _sitemap: "pages" }]);
    expect(error).toHaveBeenCalledOnce();
  });
});
