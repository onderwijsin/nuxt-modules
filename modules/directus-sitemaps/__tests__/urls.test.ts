import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

const useDirectusServer = vi.fn();

vi.mock("#imports", () => ({ useDirectusServer }));

const { buildSitemapUrls, getCollectionUrls } = await import("../src/runtime/server/utils/urls");

describe("Directus sitemap URLs", () => {
  beforeEach(() => {
    useDirectusServer.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the collection mapper and excludes no-index entries", async () => {
    useDirectusServer.mockResolvedValue([
      { slug: "hello", updatedAt: "2026-08-01T10:00:00.000Z" },
      { slug: "private", updatedAt: "2026-08-02T10:00:00.000Z" }
    ]);

    await expect(
      getCollectionUrls(undefined, {
        collection: "articles",
        sitemap: {
          fields: ["slug", "updatedAt"],
          filter: { status: { _eq: "published" } },
          mapper: (item) => {
            if (!isRecord(item) || !isString(item.slug)) return null;
            return {
              path: `/articles/${item.slug}`,
              lastUpdated: isString(item.updatedAt) ? item.updatedAt : undefined,
              noIndex: item.slug === "private",
              priority: 0.8
            };
          }
        },
        prerender: false
      })
    ).resolves.toEqual([
      { loc: "/articles/hello", lastmod: "2026-08-01T10:00:00.000Z", priority: 0.8 }
    ]);
  });

  it("passes the configured context to custom fetchers before applying the mapper", async () => {
    const fetcher = vi.fn().mockResolvedValue([{ path: "/custom" }]);

    await expect(
      getCollectionUrls(undefined, {
        collection: "pages",
        sitemap: {
          fields: ["path"],
          filter: { published: { _eq: true } },
          fetcher,
          mapper: (item) => item
        },
        prerender: false
      })
    ).resolves.toEqual([{ loc: "/custom", lastmod: undefined, priority: undefined }]);
    expect(fetcher).toHaveBeenCalledWith({
      collection: "pages",
      fields: ["path"],
      filter: { published: { _eq: true } }
    });
    expect(useDirectusServer).not.toHaveBeenCalled();
  });

  it("keeps static and successful collection entries when another collection fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      buildSitemapUrls(
        undefined,
        [
          {
            collection: "working",
            sitemap: {
              fetcher: async () => [{ path: "/working" }],
              mapper: (item) => item
            },
            prerender: false
          },
          {
            collection: "unavailable",
            sitemap: {
              fetcher: async () => Promise.reject(new Error("Directus unavailable")),
              mapper: (item) => item
            },
            prerender: false
          }
        ],
        [{ loc: "/about" }]
      )
    ).resolves.toEqual([
      { loc: "/working", lastmod: undefined, priority: undefined },
      { loc: "/about" }
    ]);
    expect(error).toHaveBeenCalledOnce();
  });

  it("omits malformed mapper results without failing the source", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      buildSitemapUrls(
        undefined,
        [
          {
            collection: "invalid",
            sitemap: { fetcher: async () => [{}], mapper: () => ({ path: "invalid" }) },
            prerender: false
          }
        ],
        [{ loc: "/about" }]
      )
    ).resolves.toEqual([{ loc: "/about" }]);
    expect(error).toHaveBeenCalledOnce();
  });
});
