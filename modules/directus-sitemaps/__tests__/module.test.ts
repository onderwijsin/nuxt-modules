import { beforeEach, describe, expect, it, vi } from "vitest";

const addPrerenderRoutes = vi.fn();
const addServerHandler = vi.fn();
const addTypeTemplate = vi.fn();

vi.mock("@nuxt/kit", () => ({
  addPrerenderRoutes,
  addServerHandler,
  addTypeTemplate,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: (definition: unknown) => definition,
  useLogger: () => ({ start: vi.fn(), success: vi.fn() })
}));

describe("directus-sitemaps module", () => {
  beforeEach(() => {
    vi.resetModules();
    addPrerenderRoutes.mockReset();
    addServerHandler.mockReset();
    addTypeTemplate.mockReset();
  });

  it("registers the source, sitemap config, cache, and prerender routes", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = {
      options: {
        runtimeConfig: { public: {} },
        sitemap: {},
        routeRules: {},
        build: { transpile: [] }
      }
    };

    const setup = Reflect.get(module, "setup");
    if (typeof setup !== "function") throw new TypeError("Module setup is unavailable.");
    setup(
      {
        collections: [{ collection: "articles", sitemap: "articles" }],
        static: [{ loc: "/about", _sitemap: "pages" }],
        cache: { maxAge: 60, staleMaxAge: 30, swr: true },
        prerender: true
      },
      nuxt
    );

    expect(addServerHandler).toHaveBeenCalledTimes(2);
    expect(nuxt.options.sitemap).toEqual({
      sitemaps: {
        articles: { sources: ["/api/_directus-sitemaps/urls"] },
        pages: { sources: ["/api/_directus-sitemaps/urls"] }
      }
    });
    expect(nuxt.options.routeRules["/api/_directus-sitemaps/urls"]).toEqual({
      cache: { maxAge: 60, staleMaxAge: 30, swr: true },
      prerender: true
    });
    expect(addPrerenderRoutes).toHaveBeenCalledWith([
      "/api/_directus-sitemaps/urls",
      "/sitemap_index.xml",
      "/articles-sitemap.xml",
      "/pages-sitemap.xml"
    ]);
  });
});
