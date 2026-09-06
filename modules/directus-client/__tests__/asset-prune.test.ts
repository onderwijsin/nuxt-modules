import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => {
  const values = new Map<string, Uint8Array>();
  const failures = new Set<string>();
  const deleteFailures = new Set<string>();
  let mountAvailable = true;
  const storage = {
    getItemRaw: async (key: string) => {
      if (failures.has(key)) throw new Error("read failed");
      return values.get(key);
    },
    removeItem: async (key: string) => {
      if (deleteFailures.has(key)) throw new Error("delete failed");
      values.delete(key);
    },
    setItemRaw: async (key: string, value: Uint8Array) => values.set(key, value),
    getKeys: async (prefix?: string) =>
      [...values.keys()].filter((key) => !prefix || key.startsWith(prefix))
  };
  const rootStorage = {
    driver: {},
    getMount: () => (mountAvailable ? { base: "/configured", driver: rootStorage.driver } : {})
  };
  return {
    values,
    failures,
    deleteFailures,
    storage,
    rootStorage,
    setMountAvailable: (value: boolean) => (mountAvailable = value)
  };
});

vi.mock("nitropack/runtime", () => ({
  useStorage: (mount?: string) => (mount ? runtime.storage : runtime.rootStorage)
}));

const { createAssetCacheStorage } = await import("../src/runtime/assets/cache");
const { pruneAssetCache } = await import("../src/runtime/assets/prune");
const { DIRECTUS_ASSET_CACHE_PREFIX } = await import("../src/runtime/assets/prune");

const now = 10_000_000;
const config = {
  enabled: true as const,
  storage: "directus-assets",
  maxAge: 60,
  maxBodySize: 10 * 1024 * 1024,
  swr: false,
  staleMaxAge: undefined,
  prune: { enabled: true, onRequest: true, interval: 3600 }
};

async function put(key: string, value: Record<string, unknown>) {
  await createAssetCacheStorage("directus-assets").set(key, {
    value: { status: 200, headers: {}, body: "asset" },
    payload: "value.body",
    ...value
  });
}

async function putRaw(key: string, value: unknown) {
  await createAssetCacheStorage("directus-assets").set(key, value);
}

describe("Directus asset-cache pruning", () => {
  beforeEach(() => {
    runtime.values.clear();
    runtime.failures.clear();
    runtime.deleteFailures.clear();
    runtime.rootStorage.driver = {};
    runtime.setMountAvailable(true);
  });

  it.each([
    ["at the expiry boundary", 60_000, false],
    ["one millisecond after expiry", 60_001, true]
  ])("uses strict ocache expiry semantics %s", async (_label, age, removed) => {
    await put(`${DIRECTUS_ASSET_CACHE_PREFIX}entry.json`, { mtime: now - age });
    const result = await pruneAssetCache(config, now);
    expect(result.removed).toBe(removed ? 1 : 0);
  });

  it("supports finite and unbounded SWR lifetimes", async () => {
    await put(`${DIRECTUS_ASSET_CACHE_PREFIX}finite.json`, {
      mtime: now - 91_000,
      staleMaxAge: 30
    });
    await put(`${DIRECTUS_ASSET_CACHE_PREFIX}unbounded.json`, {
      mtime: now - 1_000_000
    });
    const finite = await pruneAssetCache({ ...config, swr: true, staleMaxAge: undefined }, now);
    expect(finite.removed).toBe(1);
    expect(finite.retained).toBe(1);
  });

  it("honors stored lifetime overrides, including zero", async () => {
    await put(`${DIRECTUS_ASSET_CACHE_PREFIX}max-age.json`, {
      mtime: now - 61_000,
      maxAge: 120
    });
    await put(`${DIRECTUS_ASSET_CACHE_PREFIX}stale-zero.json`, {
      mtime: now - 61_000,
      staleMaxAge: 0
    });
    const result = await pruneAssetCache({ ...config, swr: true, staleMaxAge: 120 }, now);
    expect(result).toEqual({ scanned: 2, removed: 1, retained: 1, skipped: 0 });
  });

  it.each([
    ["missing value", { mtime: now }],
    ["empty value", { mtime: now, value: {} }],
    ["unsuccessful status", { mtime: now, value: { status: 404, headers: {}, body: "asset" } }],
    ["missing headers", { mtime: now, value: { status: 200, body: "asset" } }],
    ["invalid body", { mtime: now, value: { status: 200, headers: {}, body: {} } }]
  ])("removes decoded entries with %s", async (_label, entry) => {
    const key = `${DIRECTUS_ASSET_CACHE_PREFIX}malformed.json`;
    await putRaw(key, entry);
    const result = await pruneAssetCache({ ...config, swr: true, staleMaxAge: undefined }, now);
    expect(result).toMatchObject({ scanned: 1, removed: 1, retained: 0, skipped: 0 });
  });

  it("retains string and binary cached response bodies", async () => {
    await putRaw(`${DIRECTUS_ASSET_CACHE_PREFIX}string.json`, {
      mtime: now,
      value: { status: 200, headers: {}, body: "asset" }
    });
    await putRaw(`${DIRECTUS_ASSET_CACHE_PREFIX}binary.json`, {
      mtime: now,
      value: { status: 200, headers: {}, body: new Uint8Array([1, 2, 3]) },
      payload: "value.body"
    });
    const result = await pruneAssetCache({ ...config, swr: true, staleMaxAge: undefined }, now);
    expect(result).toMatchObject({ scanned: 2, removed: 0, retained: 2, skipped: 0 });
  });

  it("expires a stored maxAge of zero immediately", async () => {
    await put(`${DIRECTUS_ASSET_CACHE_PREFIX}zero.json`, { mtime: now, maxAge: 0 });
    const result = await pruneAssetCache(config, now);
    expect(result.removed).toBe(1);
  });

  it("removes malformed frames and decoded metadata but skips backend failures", async () => {
    const malformedFrame = `${DIRECTUS_ASSET_CACHE_PREFIX}frame.json`;
    runtime.values.set(malformedFrame, new Uint8Array([1, 2, 3]));
    const invalidMtime = `${DIRECTUS_ASSET_CACHE_PREFIX}mtime.json`;
    await put(invalidMtime, { mtime: -1 });
    const readFailure = `${DIRECTUS_ASSET_CACHE_PREFIX}read.json`;
    await put(readFailure, { mtime: now - 100_000 });
    runtime.failures.add(readFailure);
    const deleteFailure = `${DIRECTUS_ASSET_CACHE_PREFIX}delete.json`;
    await put(deleteFailure, { mtime: now - 100_000 });
    runtime.deleteFailures.add(deleteFailure);
    const later = `${DIRECTUS_ASSET_CACHE_PREFIX}later.json`;
    await put(later, { mtime: now - 100_000 });

    const result = await pruneAssetCache(config, now);
    expect(result).toEqual({ scanned: 5, removed: 3, retained: 0, skipped: 2 });
    expect(runtime.values.has(readFailure)).toBe(true);
    expect(runtime.values.has(deleteFailure)).toBe(true);
    expect(runtime.values.has(later)).toBe(false);
  });

  it("removes entries with invalid present lifetime metadata", async () => {
    await put(`${DIRECTUS_ASSET_CACHE_PREFIX}max-age.json`, { mtime: now, maxAge: -1 });
    await put(`${DIRECTUS_ASSET_CACHE_PREFIX}stale-age.json`, {
      mtime: now,
      staleMaxAge: "invalid"
    });
    const result = await pruneAssetCache(config, now);
    expect(result.removed).toBe(2);
  });

  it("skips enumeration when the driver advertises native TTL", async () => {
    runtime.rootStorage.driver = { flags: { ttl: true } };
    const result = await pruneAssetCache(config, now);
    expect(result).toEqual({ scanned: 0, removed: 0, retained: 0, skipped: 0 });
  });

  it("keeps unrelated storage keys untouched", async () => {
    await put("/cache:other:key.json", { mtime: now - 100_000 });
    await pruneAssetCache(config, now);
    expect(runtime.values.has("/cache:other:key.json")).toBe(true);
  });

  it("throws when the configured storage mount is missing", async () => {
    runtime.setMountAvailable(false);
    await expect(pruneAssetCache(config, now)).rejects.toThrow("not configured");
  });
});
