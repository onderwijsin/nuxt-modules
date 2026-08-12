import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

const useDirectusServer = vi.fn();
vi.mock("@onderwijsin/nuxt-directus/runtime/server", () => ({ useDirectusServer }));

const { buildSitemapUrls, fetchItemsFromCollection, mapDirectusItem, toSitemapUrl } =
  await import("../src/runtime/server/utils/sitemap-urls");

describe("Directus sitemap URL building", () => {
  beforeEach(() => useDirectusServer.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("fetches with configured fields and filters and maps valid entries", async () => {
    useDirectusServer.mockResolvedValue([
      { slug: "hello", updatedAt: "2026-08-01T10:00:00.000Z" },
      { slug: "private", updatedAt: "2026-08-02T10:00:00.000Z" }
    ]);

    await expect(
      buildSitemapUrls(
        undefined,
        [
          {
            collection: "articles",
            sitemap: {
              _sitemap: "articles",
              fields: ["slug", "updatedAt"],
              filter: { status: { _eq: "published" } },
              mapper: (item) => {
                if (!isRecord(item) || !isString(item.slug)) return null;
                return {
                  loc: `/articles/${item.slug}`,
                  lastmod: isString(item.updatedAt) ? item.updatedAt : undefined,
                  noIndex: item.slug === "private",
                  priority: 0.8
                };
              }
            },
            prerender: false
          }
        ],
        []
      )
    ).resolves.toEqual([
      {
        loc: "/articles/hello",
        lastmod: "2026-08-01T10:00:00.000Z",
        priority: 0.8,
        _sitemap: "articles"
      }
    ]);
    expect(useDirectusServer).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it("uses a shared fetcher before mapping and skips the Directus client", async () => {
    const fetcher = vi.fn().mockResolvedValue([{ slug: "custom" }]);
    const mapper = vi.fn(() => ({ loc: "/custom" }));

    await expect(
      buildSitemapUrls(
        undefined,
        [
          {
            collection: "pages",
            sitemap: { fields: ["slug"], filter: { published: { _eq: true } }, fetcher, mapper },
            prerender: false
          }
        ],
        []
      )
    ).resolves.toEqual([{ loc: "/custom", _sitemap: undefined }]);
    expect(fetcher).toHaveBeenCalledWith({
      collection: "pages",
      fields: ["slug"],
      filter: { published: { _eq: true } }
    });
    expect(mapper).toHaveBeenCalledWith({ slug: "custom" });
    expect(useDirectusServer).not.toHaveBeenCalled();
  });

  it("supports declarative field maps and ignores non-array Directus responses", async () => {
    expect(
      mapDirectusItem(
        { slug: "mapped", updated: "2026-08-03" },
        { loc: "slug", lastmod: "updated" }
      )
    ).toEqual({
      loc: "mapped",
      lastmod: "2026-08-03"
    });
    useDirectusServer.mockResolvedValue({ data: [] });
    await expect(
      fetchItemsFromCollection(undefined, {
        collection: "articles",
        sitemap: {},
        prerender: false
      })
    ).resolves.toEqual([]);
  });

  it("omits disabled collections, malformed entries, and no-index entries", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      buildSitemapUrls(
        undefined,
        [
          { collection: "excluded", sitemap: false, prerender: false },
          {
            collection: "pages",
            sitemap: {
              fetcher: async () => [{}],
              mapper: () => ({ loc: "/valid", unknown: true })
            },
            prerender: false
          },
          {
            collection: "hidden",
            sitemap: {
              fetcher: async () => [{}],
              mapper: () => ({ loc: "/hidden", noIndex: true })
            },
            prerender: false
          }
        ],
        [{ loc: "/about" }]
      )
    ).resolves.toEqual([{ loc: "/about" }]);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("preserves successful collections and static entries when another fetch or mapper fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      buildSitemapUrls(
        undefined,
        [
          {
            collection: "working",
            sitemap: { fetcher: async () => [{ loc: "/working" }] },
            prerender: false
          },
          {
            collection: "unavailable",
            sitemap: { fetcher: async () => Promise.reject(new Error("Directus unavailable")) },
            prerender: false
          },
          {
            collection: "broken",
            sitemap: {
              fetcher: async () => [{}],
              mapper: () => {
                throw new Error("Mapper failed");
              }
            },
            prerender: false
          }
        ],
        [{ loc: "/about" }]
      )
    ).resolves.toEqual([{ loc: "/working" }, { loc: "/about" }]);
    expect(error).toHaveBeenCalledTimes(2);
  });

  it("filters by collection and can exclude static entries", async () => {
    await expect(
      buildSitemapUrls(
        undefined,
        [
          {
            collection: "pages",
            sitemap: { fetcher: async () => [{ loc: "/page" }] },
            prerender: false
          },
          {
            collection: "articles",
            sitemap: { fetcher: async () => [{ loc: "/article" }] },
            prerender: false
          }
        ],
        [{ loc: "/about" }],
        { filterByCollection: "articles", excludeStaticUrls: true }
      )
    ).resolves.toEqual([{ loc: "/article" }]);
  });

  it("validates standalone entries and drops non-objects", () => {
    expect(toSitemapUrl(null)).toBeNull();
    expect(toSitemapUrl({ loc: "/about" }, "pages")).toEqual({ loc: "/about", _sitemap: "pages" });
  });
});
