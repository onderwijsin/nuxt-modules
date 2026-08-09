import { beforeEach, describe, expect, it, vi } from "vitest";

const values = new Map<string, unknown>();
const clear = vi.fn(async (prefix: string) => {
  for (const key of values.keys()) if (key.startsWith(prefix)) values.delete(key);
});
const localFetch = vi.fn();

vi.mock("nitropack/runtime", () => ({
  useRuntimeConfig: () => ({ redirects: { storageMount: "redirects" } }),
  useNitroApp: () => ({ localFetch }),
  useStorage: () => ({
    getItem: async <T>(key: string): Promise<T | null> =>
      (values.get(key) as T | undefined) ?? null,
    setItem: async (key: string, value: unknown) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
    clear
  })
}));

import {
  findRedirect,
  getRedirectManifest,
  refreshRedirectStorage,
  removeRedirect,
  upsertRedirect
} from "../src/runtime/server/utils/storage";

describe("redirect storage refresh", () => {
  beforeEach(() => {
    values.clear();
    clear.mockClear();
    localFetch.mockReset();
    localFetch.mockResolvedValue(undefined);
  });

  it("keeps the first duplicate from source order and logs the ignored record", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      refreshRedirectStorage([
        [{ from: "/old", to: "/first", statusCode: 301 }],
        [{ from: "/old/", to: "/second", statusCode: 302 }]
      ])
    ).resolves.toEqual({
      "/old": { from: "/old", to: "/first", statusCode: 301 }
    });
    await expect(findRedirect("/old")).resolves.toEqual({
      from: "/old",
      to: "/first",
      statusCode: 301
    });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("first source entry wins"));
  });

  it("prefers an exact query origin before the path-only fallback", async () => {
    await refreshRedirectStorage([
      [
        { from: "/search", to: "/all" },
        { from: "/search?q=old", to: "/archive?source=redirect" }
      ]
    ]);

    await expect(findRedirect("/search?q=old")).resolves.toMatchObject({
      to: "/archive?source=redirect"
    });
    await expect(findRedirect("/search?q=new")).resolves.toMatchObject({ to: "/all" });
  });

  it("removes stale entries while replacing the compact manifest", async () => {
    await refreshRedirectStorage([[{ from: "/old", to: "/before" }]]);
    await refreshRedirectStorage([[{ from: "/new", to: "/after" }]]);

    await expect(findRedirect("/old")).resolves.toBeNull();
    await expect(getRedirectManifest()).resolves.toMatchObject({
      redirects: { "/new": { from: "/new", to: "/after", statusCode: 302 } }
    });
  });

  it("updates individual webhook records, invalidates their caches, and primes the new lookup", async () => {
    await upsertRedirect({ from: "/campaign/?b=2&a=1", to: "example.com/offer", statusCode: 308 });

    await expect(findRedirect("/campaign?a=1&b=2")).resolves.toEqual({
      from: "/campaign?a=1&b=2",
      to: "example.com/offer",
      statusCode: 308
    });
    expect(values.has("/cache:redirects:index:all.json")).toBe(false);
    expect(values.has("/cache:redirects:lookup:2Fcampaign3Fa3D13Fb3D2.json")).toBe(false);
    expect(localFetch).toHaveBeenCalledWith("/api/_redirects/%2Fcampaign%3Fa%3D1%26b%3D2");
    await removeRedirect("/campaign?b=2&a=1");
    await expect(findRedirect("/campaign?a=1&b=2")).resolves.toBeNull();
    await expect(getRedirectManifest()).resolves.toMatchObject({ redirects: {} });
  });

  it("clears every lookup cache when a path-only webhook redirect changes", async () => {
    values.set("/cache:redirects:lookup:2Fproduct.json", { value: "old" });
    values.set("/cache:redirects:lookup:2Fproduct3Fcampaign3Dspring.json", { value: "old" });

    await upsertRedirect({ from: "/product", to: "/new-product" });

    expect(clear).toHaveBeenCalledWith("/cache:redirects:lookup:");
    expect(values.has("/cache:redirects:lookup:2Fproduct.json")).toBe(false);
    expect(values.has("/cache:redirects:lookup:2Fproduct3Fcampaign3Dspring.json")).toBe(false);
  });

  it("keeps the current manifest when validation rejects an incoming refresh", async () => {
    await refreshRedirectStorage([[{ from: "/stable", to: "/current" }]]);

    await expect(
      refreshRedirectStorage([[{ from: "not-a-path", to: "/invalid" }]])
    ).rejects.toThrow("Redirect origins must start");
    await expect(findRedirect("/stable")).resolves.toMatchObject({ to: "/current" });
  });
});
