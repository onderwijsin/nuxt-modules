import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";
import { describe, expect, it } from "vitest";
import {
  createCacheDriver,
  getCacheIndexKey,
  getCacheMetadataKey,
  normalizeCacheBase
} from "../src/runtime";
import { invalidateCacheTargets } from "../src/runtime/server/utils/invalidate";

describe("cache runtime", () => {
  it("validates the route-rule cache base contract", () => {
    expect(normalizeCacheBase("kennisbank:articles")).toBe("kennisbank:articles");
    expect(() => normalizeCacheBase("kennisbank/articles")).toThrow("<group>:<name>");
  });

  it("writes aligned metadata and a reverse path index, then cleans them on deletion", async () => {
    const storage = createStorage({
      driver: createCacheDriver(memoryDriver(), {
        getRequestPath: () => "/kennisbank/artikelen/example"
      })
    });
    const key = "kennisbank:articles:example:abc123";
    const indexKey = getCacheIndexKey("kennisbank:articles", "/kennisbank/artikelen/example", key);
    await storage.setItem(key, { title: "Example" }, { ttl: 60 });
    expect(await storage.getItem(getCacheMetadataKey(key))).toEqual({
      version: 1,
      path: "/kennisbank/artikelen/example"
    });
    expect(await storage.getItem(indexKey)).toBe(key);
    await storage.removeItem(key);
    expect(await storage.getItem(key)).toBeNull();
    expect(await storage.getItem(getCacheMetadataKey(key))).toBeNull();
    expect(await storage.getItem(indexKey)).toBeNull();
  });

  it("adds metadata and reverse indexes after batch writes", async () => {
    const path = "/kennisbank/artikelen";
    const storage = createStorage({
      driver: createCacheDriver(memoryDriver(), { getRequestPath: () => path })
    });
    const firstKey = "kennisbank:articles:first:abc123";
    const secondKey = "kennisbank:articles:second:def456";

    await storage.setItems([
      { key: firstKey, value: { title: "First" } },
      { key: secondKey, value: { title: "Second" } }
    ]);

    expect(await storage.getItem(getCacheIndexKey("kennisbank:articles", path, firstKey))).toBe(
      firstKey
    );
    expect(await storage.getItem(getCacheIndexKey("kennisbank:articles", path, secondKey))).toBe(
      secondKey
    );
  });

  it("moves the reverse index when a cache entry is overwritten from a different request path", async () => {
    const key = "kennisbank:articles:example:abc123";
    let path = "/kennisbank/artikelen/first";
    const storage = createStorage({
      driver: createCacheDriver(memoryDriver(), { getRequestPath: () => path })
    });
    await storage.setItem(key, { title: "First" });

    path = "/kennisbank/artikelen/second";
    await storage.setItem(key, { title: "Second" });

    expect(
      await storage.getItem(
        getCacheIndexKey("kennisbank:articles", "/kennisbank/artikelen/first", key)
      )
    ).toBeNull();
    expect(
      await storage.getItem(
        getCacheIndexKey("kennisbank:articles", "/kennisbank/artikelen/second", key)
      )
    ).toBe(key);
    expect(await storage.getMeta(key)).toMatchObject({
      version: 1,
      path: "/kennisbank/artikelen/second"
    });
  });

  it("invalidates prefix matches without crossing cache bases", async () => {
    const storage = createStorage({ driver: memoryDriver() });
    const articleKey = "kennisbank:articles:example:abc123";
    const otherBaseKey = "kennisbank:news:example:def456";
    const articlePath = "/kennisbank/artikelen/example";
    await storage.setItem(articleKey, { title: "Example" });
    await storage.setItem(otherBaseKey, { title: "News" });
    await storage.setItem(
      getCacheIndexKey("kennisbank:articles", articlePath, articleKey),
      articleKey
    );
    await storage.setItem(
      getCacheMetadataKey(articleKey),
      JSON.stringify({ version: 1, path: articlePath })
    );
    await storage.setItem(
      getCacheIndexKey("kennisbank:news", articlePath, otherBaseKey),
      otherBaseKey
    );
    const removed = await invalidateCacheTargets(
      storage,
      [{ base: "kennisbank:articles", path: "/kennisbank/artikelen", match: "prefix" }],
      10
    );
    expect(removed).toBe(1);
    expect(await storage.getItem(articleKey)).toBeNull();
    expect(await storage.getItem(otherBaseKey)).toEqual({ title: "News" });
    expect(await storage.getItem(getCacheMetadataKey(articleKey))).toBeNull();
  });

  it("finds reverse-index records through the wrapped storage driver", async () => {
    const path = "/kennisbank/artikelen/example";
    const key = "kennisbank:articles:example:abc123";
    const storage = createStorage({
      driver: createCacheDriver(memoryDriver(), { getRequestPath: () => path })
    });
    await storage.setItem(key, { title: "Example" });

    const removed = await invalidateCacheTargets(
      storage,
      [{ base: "kennisbank:articles", path, match: "exact" }],
      10
    );

    expect(removed).toBe(1);
    expect(await storage.getItem(key)).toBeNull();
  });

  it("lazily removes stale index records", async () => {
    const storage = createStorage({ driver: memoryDriver() });
    const key = "kennisbank:articles:expired:abc123";
    const indexKey = getCacheIndexKey("kennisbank:articles", "/kennisbank/artikelen/expired", key);
    await storage.setItem(indexKey, key);
    const removed = await invalidateCacheTargets(
      storage,
      [{ base: "kennisbank:articles", path: "/kennisbank/artikelen/expired", match: "exact" }],
      10
    );
    expect(removed).toBe(1);
    expect(await storage.getItem(indexKey)).toBeNull();
  });
});
