import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeConfig = vi.hoisted(() => ({
  healthcheck: {
    timeoutMs: 5,
    cache: { enabled: false },
    directus: { enabled: false, baseUrl: "", timeoutMs: 5 }
  }
}));
const storage = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn()
}));
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("#imports", () => ({
  useRuntimeConfig: () => runtimeConfig
}));
vi.mock("nitropack/runtime", () => ({
  useStorage: () => storage
}));
vi.mock("ofetch", () => ({ ofetch: fetchMock }));

import { getSystemHealth } from "../src/runtime/server/utils/health";

describe("getSystemHealth", () => {
  beforeEach(() => {
    runtimeConfig.healthcheck = {
      timeoutMs: 5,
      cache: { enabled: false },
      directus: { enabled: false, baseUrl: "", timeoutMs: 5 }
    };
    storage.getItem.mockReset();
    storage.removeItem.mockReset();
    storage.setItem.mockReset();
    fetchMock.mockReset();
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

  it("aborts built-in HTTP probes at their configured timeout", async () => {
    runtimeConfig.healthcheck = {
      timeoutMs: 50,
      cache: { enabled: false },
      directus: { enabled: true, baseUrl: "https://directus.example.com", timeoutMs: 5 }
    };
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => undefined);
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const health = await Reflect.apply(getSystemHealth, undefined, [{}]);

    expect(health.components.directus?.status).toBe("error");
    expect(signal?.aborted).toBe(true);
    error.mockRestore();
  });

  it("preserves the Directus installation path when pinging", async () => {
    runtimeConfig.healthcheck = {
      timeoutMs: 50,
      cache: { enabled: false },
      directus: { enabled: true, baseUrl: "https://directus.example.com/directus/", timeoutMs: 50 }
    };
    fetchMock.mockResolvedValue(undefined);

    await Reflect.apply(getSystemHealth, undefined, [{}]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://directus.example.com/directus/server/ping",
      expect.objectContaining({ retry: 0, signal: expect.any(AbortSignal) })
    );
  });
});
