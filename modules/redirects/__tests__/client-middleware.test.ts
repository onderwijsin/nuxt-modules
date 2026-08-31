import { beforeEach, describe, expect, it, vi } from "vitest";

const { addRouteMiddleware, navigateTo, fetchRedirect, warning } = vi.hoisted(() => ({
  addRouteMiddleware: vi.fn(),
  navigateTo: vi.fn(),
  fetchRedirect: vi.fn(),
  warning: vi.fn()
}));

vi.mock("#app", () => ({
  addRouteMiddleware,
  defineNuxtPlugin: (plugin: unknown) => plugin,
  navigateTo,
  onNuxtReady: vi.fn(),
  useRuntimeConfig: () => ({
    public: {
      redirects: {
        routeMiddleware: true,
        store: false,
        excludedNamespaces: [],
        excludedRoutes: []
      }
    }
  })
}));

vi.mock("ofetch", () => ({ $fetch: fetchRedirect }));

import redirectsPlugin from "../src/runtime/app/plugins/redirects.client";

describe("client redirect middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    addRouteMiddleware.mockReset();
    navigateTo.mockReset();
    fetchRedirect.mockReset();
    warning.mockReset();
    vi.spyOn(console, "warn").mockImplementation(warning);
    Reflect.apply(redirectsPlugin, undefined, [{}]);
  });

  it("ignores destinations equivalent after trailing-slash normalization", async () => {
    fetchRedirect.mockResolvedValue({ data: { from: "/foo", to: "/foo/", statusCode: 301 } });
    const middleware = addRouteMiddleware.mock.calls[0]?.[1];

    await expect(
      middleware({ fullPath: "/foo", path: "/foo" }, { fullPath: "/old" })
    ).resolves.toBe(undefined);

    expect(navigateTo).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("Ignoring self-redirect"));
  });

  it("navigates for normal internal redirects", async () => {
    fetchRedirect.mockResolvedValue({ data: { from: "/foo", to: "/bar", statusCode: 301 } });
    const middleware = addRouteMiddleware.mock.calls[0]?.[1];

    await middleware({ fullPath: "/foo", path: "/foo" }, { fullPath: "/old" });

    expect(navigateTo).toHaveBeenCalledWith("/bar", {
      external: false,
      redirectCode: 301
    });
  });
});
