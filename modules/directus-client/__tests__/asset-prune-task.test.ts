import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
  config: { directusClient: { assets: { cache: { enabled: false } } } },
  pruneAssetCache: vi.fn()
}));

vi.mock("nitropack/runtime", () => ({
  defineTask: (task: unknown) => task,
  useRuntimeConfig: () => runtime.config
}));
vi.mock("../src/runtime/assets/prune", () => ({
  pruneAssetCache: runtime.pruneAssetCache
}));

const task = (await import("../src/runtime/tasks/prune")).default as {
  run: () => Promise<unknown>;
};

describe("Directus asset-cache prune task", () => {
  beforeEach(() => runtime.pruneAssetCache.mockReset());

  it("does not touch storage when caching or pruning is disabled", async () => {
    runtime.config = { directusClient: { assets: { cache: { enabled: false } } } };
    await expect(task.run()).resolves.toEqual({
      result: { scanned: 0, removed: 0, retained: 0, skipped: 0 }
    });
    runtime.config = {
      directusClient: {
        assets: { cache: { enabled: true, prune: { enabled: false } } }
      }
    };
    await expect(task.run()).resolves.toEqual({
      result: { scanned: 0, removed: 0, retained: 0, skipped: 0 }
    });
    expect(runtime.pruneAssetCache).not.toHaveBeenCalled();
  });

  it("returns the shared prune summary and propagates failures", async () => {
    const config = {
      enabled: true as const,
      storage: "assets",
      maxAge: 60,
      maxBodySize: 100,
      swr: false,
      prune: { enabled: true, onRequest: true, interval: 60 }
    };
    const summary = { scanned: 2, removed: 1, retained: 1, skipped: 0 };
    runtime.config = { directusClient: { assets: { cache: config } } };
    runtime.pruneAssetCache.mockResolvedValue(summary);
    await expect(task.run()).resolves.toEqual({ result: summary });
    runtime.pruneAssetCache.mockImplementationOnce(async () => {
      throw new Error("backend failed");
    });
    await expect(task.run()).rejects.toThrow("backend failed");
  });
});
