import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pruneAssetCache = vi.hoisted(() => vi.fn());

vi.mock("../src/runtime/assets/prune", () => ({ pruneAssetCache }));
vi.mock("nitropack/runtime", () => ({
  useNitroApp: () => ({ directusAssetCache: undefined }),
  useStorage: () => ({})
}));

const { createAssetCacheState } = await import("../src/runtime/assets/cache");
const { scheduleAssetCachePrune } = await import("../src/runtime/assets/prune-coordinator");

const config = {
  enabled: true as const,
  storage: "assets",
  maxAge: 60,
  maxBodySize: 100,
  swr: false,
  prune: { enabled: true, onRequest: true, interval: 60 }
};

describe("Directus asset-cache prune coordinator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    pruneAssetCache.mockReset();
    pruneAssetCache.mockResolvedValue({ scanned: 0, removed: 0, retained: 0, skipped: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not schedule disabled or request-disabled pruning", () => {
    const state = createAssetCacheState();
    expect(
      scheduleAssetCachePrune(state, { ...config, prune: { ...config.prune, enabled: false } })
    ).toBeUndefined();
    expect(
      scheduleAssetCachePrune(state, { ...config, prune: { ...config.prune, onRequest: false } })
    ).toBeUndefined();
    expect(pruneAssetCache).not.toHaveBeenCalled();
  });

  it("single-flights and throttles attempts per application state", async () => {
    let resolve!: () => void;
    pruneAssetCache.mockReturnValueOnce(new Promise<void>((done) => (resolve = done)));
    const state = createAssetCacheState();
    const first = scheduleAssetCachePrune(state, config);
    expect(scheduleAssetCachePrune(state, config)).toBe(first);
    expect(pruneAssetCache).toHaveBeenCalledOnce();
    resolve();
    await first;
    vi.advanceTimersByTime(59_999);
    expect(scheduleAssetCachePrune(state, config)).toBeUndefined();
    vi.advanceTimersByTime(1);
    scheduleAssetCachePrune(state, config);
    expect(pruneAssetCache).toHaveBeenCalledTimes(2);
    expect(scheduleAssetCachePrune(createAssetCacheState(), config)).toBeDefined();
  });

  it("contains failures and releases the single-flight state", async () => {
    const error = new Error("storage failed");
    pruneAssetCache.mockRejectedValueOnce(error);
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const state = createAssetCacheState();
    await scheduleAssetCachePrune(state, config);
    expect(log).toHaveBeenCalledWith("[directus-client] Asset cache pruning failed.", error);
    expect(state.prune.promise).toBeUndefined();
    log.mockRestore();
  });
});
