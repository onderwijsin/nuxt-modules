import { beforeEach, describe, expect, it, vi } from "vitest";

const addPrerenderRoutes = vi.fn();
const addServerHandler = vi.fn();
const addServerTemplate = vi.fn();
const addTypeTemplate = vi.fn();

vi.mock("@nuxt/kit", () => ({
  addPrerenderRoutes,
  addServerHandler,
  addServerTemplate,
  addTypeTemplate,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: (definition: unknown) => definition,
  useLogger: () => ({ start: vi.fn(), success: vi.fn(), warn: vi.fn() })
}));

describe("directus-sitemaps module", () => {
  beforeEach(() => {
    vi.resetModules();
    addPrerenderRoutes.mockReset();
    addServerHandler.mockReset();
    addServerTemplate.mockReset();
    addTypeTemplate.mockReset();
  });

  it("registers one source, endpoint caching, and sitemap prerender routes", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = {
      options: {
        runtimeConfig: { public: {} },
        sitemap: { sources: ["/existing-source"] },
        routeRules: {},
        build: { transpile: [] }
      }
    };

    const setup = Reflect.get(module, "setup");
    if (typeof setup !== "function") throw new TypeError("Module setup is unavailable.");
    setup(
      {
        sitemaps: {
          static: [{ loc: "/about" }],
          cache: { maxAge: 60, staleMaxAge: 30, swr: true },
          prerenderSitemaps: true
        }
      },
      nuxt
    );

    expect(addServerHandler).toHaveBeenCalledTimes(2);
    expect(nuxt.options.sitemap.sources).toEqual([
      "/api/_directus-sitemaps/urls",
      "/existing-source"
    ]);
    expect(Object.values(nuxt.options.routeRules)).toContainEqual({
      cache: { maxAge: 60, staleMaxAge: 30, swr: true },
      prerender: true
    });
    expect(addPrerenderRoutes).toHaveBeenCalledWith([
      "/api/_directus-sitemaps/urls",
      "/sitemap.xml",
      "/sitemap_index.xml"
    ]);
  });
});
