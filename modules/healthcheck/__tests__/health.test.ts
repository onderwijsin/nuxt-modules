import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeConfig = vi.hoisted(() => ({
  healthcheck: {
    timeoutMs: 5,
    cache: { enabled: false }
  }
}));
const storage = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn()
}));

vi.mock("#imports", () => ({
  useRuntimeConfig: () => runtimeConfig
}));
vi.mock("nitropack/runtime", () => ({
  useStorage: () => storage
}));

import { getSystemHealth } from "../src/runtime/server/utils/health";

describe("getSystemHealth", () => {
  beforeEach(() => {
    runtimeConfig.healthcheck = { timeoutMs: 5, cache: { enabled: false } };
    storage.getItem.mockReset();
    storage.removeItem.mockReset();
    storage.setItem.mockReset();
  });

  it("settles timed-out checks and never exposes thrown error messages", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let signal: AbortSignal | undefined;
    const health = await Reflect.apply(getSystemHealth, undefined, [
      {},
      new Map([
        [
          "database",
          {
            handler: ({ signal: handlerSignal }) => {
              signal = handlerSignal;
              throw new Error("postgres://private-host:5432/application");
            }
          }
        ],
        [
          "stalled",
          {
            handler: ({ signal: handlerSignal }) => {
              signal = handlerSignal;
              return new Promise(() => undefined);
            }
          }
        ]
      ])
    ]);

    expect(health.status).toBe("error");
    expect(health.components.database?.error).toBe("Health check failed");
    expect(health.components.stalled?.error).toBe("Health check failed");
    expect(JSON.stringify(health)).not.toContain("private-host");
    expect(signal?.aborted).toBe(true);
    error.mockRestore();
  });

  it("awaits cache probe cleanup when the cache read fails", async () => {
    let cleanupComplete = false;
    runtimeConfig.healthcheck.cache.enabled = true;
    storage.getItem.mockResolvedValue({ health: 0 });
    storage.removeItem.mockImplementation(async () => {
      await Promise.resolve();
      cleanupComplete = true;
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const health = await Reflect.apply(getSystemHealth, undefined, [{}]);

    expect(health.components.cache?.status).toBe("error");
    expect(storage.removeItem).toHaveBeenCalledOnce();
    expect(cleanupComplete).toBe(true);
    error.mockRestore();
  });
});
