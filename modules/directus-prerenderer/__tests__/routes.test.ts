import { beforeEach, describe, expect, it, vi } from "vitest";

const { getResolvedDirectusConfig, request } = vi.hoisted(() => ({
  getResolvedDirectusConfig: vi.fn(),
  request: vi.fn()
}));

vi.mock("@onderwijsin/nuxt-directus-config/schema", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-directus-config/schema")>()),
  getResolvedDirectusConfig
}));

vi.mock("@onderwijsin/nuxt-module-utils/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/shared")>()),
  createDirectusRestClient: vi.fn(() => ({ request }))
}));

import { buildPrerenderRoutes } from "../src/utils/routes";

type TestNuxt = {
  options: { directusSitemaps?: unknown };
  hook: ReturnType<typeof vi.fn>;
};

function createNuxt(): TestNuxt {
  return {
    options: {},
    hook: vi.fn()
  };
}

describe("Directus prerender routes", () => {
  beforeEach(() => {
    getResolvedDirectusConfig.mockReset();
    getResolvedDirectusConfig.mockReturnValue(undefined);
    request.mockReset();
  });

  it("maps composite routes and deduplicates them", async () => {
    const nuxt = createNuxt();
    const fetcher = vi.fn().mockResolvedValue([
      { parent: { path: "/guides" }, slug: "intro" },
      { parent: { path: "/guides" }, slug: "intro" }
    ]);

    await expect(
      buildPrerenderRoutes(
        nuxt as never,
        [
          {
            collection: "pages",
            sitemap: false,
            prerender: {
              fields: ["parent.path", "slug"],
              fetcher,
              mapper: (item: unknown) => {
                if (!item || typeof item !== "object" || !("parent" in item) || !("slug" in item)) {
                  return null;
                }
                const parent = item.parent;
                return parent &&
                  typeof parent === "object" &&
                  "path" in parent &&
                  typeof parent.path === "string" &&
                  typeof item.slug === "string"
                  ? `${parent.path}/${item.slug}`
                  : null;
              }
            }
          }
        ],
        {
          instance: {},
          includeStaticSitemapUrls: false,
          queryLimit: 100,
          failureMode: "best-effort"
        }
      )
    ).resolves.toEqual(["/guides/intro"]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("supports declarative route field mapping", async () => {
    const nuxt = createNuxt();

    await expect(
      buildPrerenderRoutes(
        nuxt as never,
        [
          {
            collection: "pages",
            sitemap: false,
            prerender: {
              fetcher: async () => [{ permalink: "/about" }],
              fieldmap: { route: "permalink" }
            }
          }
        ],
        {
          instance: {},
          includeStaticSitemapUrls: false,
          queryLimit: 100,
          failureMode: "best-effort"
        }
      )
    ).resolves.toEqual(["/about"]);
  });

  it("ignores disabled collections and invalid route candidates", async () => {
    const nuxt = createNuxt();

    await expect(
      buildPrerenderRoutes(
        nuxt as never,
        [
          {
            collection: "disabled",
            sitemap: false,
            prerender: false
          },
          {
            collection: "pages",
            sitemap: false,
            prerender: {
              fetcher: async () => ["/valid", "relative", null, { route: "/ignored" }]
            }
          }
        ],
        {
          instance: {},
          includeStaticSitemapUrls: false,
          queryLimit: 100,
          failureMode: "best-effort"
        }
      )
    ).resolves.toEqual(["/valid"]);
  });

  it("includes static sitemap URLs only when explicitly enabled", async () => {
    const nuxt = createNuxt();
    getResolvedDirectusConfig.mockReturnValue({
      sitemaps: { static: [{ loc: "/contact" }, { loc: "/about" }] }
    });

    await expect(
      buildPrerenderRoutes(nuxt as never, [], {
        instance: {},
        includeStaticSitemapUrls: true,
        queryLimit: 100,
        failureMode: "best-effort"
      })
    ).resolves.toEqual(["/contact", "/about"]);
  });

  it("prefers direct sitemap module static URLs when configured", async () => {
    const nuxt = createNuxt();
    nuxt.options.directusSitemaps = { static: [{ loc: "/direct" }] };
    getResolvedDirectusConfig.mockReturnValue({ sitemaps: { static: [{ loc: "/shared" }] } });

    await expect(
      buildPrerenderRoutes(nuxt as never, [], {
        instance: {},
        includeStaticSitemapUrls: true,
        queryLimit: 100,
        failureMode: "best-effort"
      })
    ).resolves.toEqual(["/direct"]);
  });

  it("keeps successful collections when another collection fails", async () => {
    const nuxt = createNuxt();
    const error = new Error("Directus unavailable");

    await expect(
      buildPrerenderRoutes(
        nuxt as never,
        [
          {
            collection: "working",
            sitemap: false,
            prerender: {
              fetcher: async () => [{ permalink: "/working" }],
              fieldmap: { route: "permalink" }
            }
          },
          {
            collection: "broken",
            sitemap: false,
            prerender: { fetcher: async () => Promise.reject(error) }
          }
        ],
        {
          instance: {},
          includeStaticSitemapUrls: false,
          queryLimit: 100,
          failureMode: "best-effort"
        }
      )
    ).resolves.toEqual(["/working"]);
  });

  it("rejects a failed built-in page in hard-failure mode", async () => {
    const nuxt = createNuxt();
    request.mockRejectedValueOnce(new Error("Directus unavailable"));

    await expect(
      buildPrerenderRoutes(
        nuxt as never,
        [
          {
            collection: "pages",
            sitemap: false,
            prerender: { fieldmap: { route: "permalink" } }
          }
        ],
        {
          instance: { baseUrl: "https://directus.example.test" },
          includeStaticSitemapUrls: false,
          queryLimit: 100,
          failureMode: "hard-failure"
        }
      )
    ).rejects.toThrow("Directus unavailable");
  });

  it("deduplicates collection and static sitemap routes", async () => {
    const nuxt = createNuxt();
    getResolvedDirectusConfig.mockReturnValue({
      sitemaps: { static: [{ loc: "/contact" }, { loc: "/shared" }] }
    });

    await expect(
      buildPrerenderRoutes(
        nuxt as never,
        [
          {
            collection: "pages",
            sitemap: false,
            prerender: {
              fetcher: async () => [{ permalink: "/shared" }, { permalink: "/page" }],
              fieldmap: { route: "permalink" }
            }
          }
        ],
        {
          instance: {},
          includeStaticSitemapUrls: true,
          queryLimit: 100,
          failureMode: "best-effort"
        }
      )
    ).resolves.toEqual(["/shared", "/page", "/contact"]);
  });

  it("isolates a failed paginated fetch in best-effort mode", async () => {
    const nuxt = createNuxt();
    request
      .mockResolvedValueOnce([{ permalink: "/partial" }])
      .mockRejectedValueOnce(new Error("Directus unavailable"));

    await expect(
      buildPrerenderRoutes(
        nuxt as never,
        [
          {
            collection: "broken",
            sitemap: false,
            prerender: { fieldmap: { route: "permalink" } }
          },
          {
            collection: "working",
            sitemap: false,
            prerender: {
              fetcher: async () => [{ permalink: "/working" }],
              fieldmap: { route: "permalink" }
            }
          }
        ],
        {
          instance: { baseUrl: "https://directus.example.test" },
          includeStaticSitemapUrls: false,
          queryLimit: 1,
          failureMode: "best-effort"
        }
      )
    ).resolves.toEqual(["/partial", "/working"]);
  });
});
