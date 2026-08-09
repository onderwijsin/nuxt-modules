import { beforeEach, describe, expect, it, vi } from "vitest";

const storageByNamespace = vi.hoisted(() => new Map<string, Map<string, unknown>>());
const request = vi.hoisted(() => ({ ip: "192.0.2.1", path: "/api/newsletter/signup" }));
const runtimeConfig = vi.hoisted(() => ({
  simpleRateLimiter: {
    global: { enabled: false, pruning: { enabled: false, staleAfter: 86_400 } }
  }
}));

vi.mock("h3", () => ({
  createError: ({
    statusCode,
    statusMessage,
    data
  }: {
    statusCode: number;
    statusMessage: string;
    data?: unknown;
  }) => Object.assign(new Error(statusMessage), { statusCode, statusMessage, data }),
  getRequestIP: () => request.ip,
  getRequestURL: () => new URL(`https://example.test${request.path}`)
}));
vi.mock("nitropack/runtime", () => ({
  useRuntimeConfig: () => runtimeConfig,
  useStorage: (namespace: string) => {
    const entries = storageByNamespace.get(namespace) ?? new Map<string, unknown>();
    storageByNamespace.set(namespace, entries);
    return {
      getItem: async (key: string) => entries.get(key),
      setItem: async (key: string, value: unknown) => entries.set(key, value),
      getKeys: async () => [...entries.keys()],
      removeItem: async (key: string) => entries.delete(key)
    };
  }
}));
vi.mock("zod", () => ({
  z: {
    boolean: () => ({ optional: () => ({}) }),
    number: () => ({
      int: () => ({
        positive: () => ({}),
        nonnegative: () => ({})
      })
    }),
    strictObject: () => ({ parse: (value: unknown) => value })
  }
}));

import { enforceGlobalRateLimit, enforceRateLimit } from "../src/runtime";
import { pruneGlobalRateLimitStorage } from "../src/runtime/server/utils/global";

const config = { max: 2, duration: 60, ban: 900 };

describe("enforceRateLimit", () => {
  beforeEach(() => {
    storageByNamespace.clear();
    runtimeConfig.simpleRateLimiter.global.enabled = false;
    runtimeConfig.simpleRateLimiter.global.pruning.enabled = false;
    runtimeConfig.simpleRateLimiter.global.pruning.staleAfter = 86_400;
    request.ip = "192.0.2.1";
    request.path = "/api/newsletter/signup";
  });

  it("limits requests from one IP", async () => {
    await Reflect.apply(enforceRateLimit, undefined, [{}, config]);
    await Reflect.apply(enforceRateLimit, undefined, [{}, config]);

    await expect(Reflect.apply(enforceRateLimit, undefined, [{}, config])).rejects.toMatchObject({
      statusCode: 429,
      data: { bannedUntil: expect.any(Number), limits: config }
    });
  });

  it("does not use global storage when global limiting is disabled", async () => {
    await Reflect.apply(enforceRateLimit, undefined, [{}, config]);

    expect(storageByNamespace.has("simple-rate-limiter:global")).toBe(false);
  });

  it("logs once and does not enforce when global limiting is disabled", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      Reflect.apply(enforceGlobalRateLimit, undefined, [{}, config])
    ).resolves.toBeUndefined();
    await expect(
      Reflect.apply(enforceGlobalRateLimit, undefined, [{}, config])
    ).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("was not globally rate limited"));
    expect(storageByNamespace.has("simple-rate-limiter:global")).toBe(false);
    error.mockRestore();
  });

  it("logs when a global duration exceeds pruning retention", async () => {
    runtimeConfig.simpleRateLimiter.global.enabled = true;
    runtimeConfig.simpleRateLimiter.global.pruning.enabled = true;
    runtimeConfig.simpleRateLimiter.global.pruning.staleAfter = 10;
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await Reflect.apply(enforceGlobalRateLimit, undefined, [{}, config]);

    expect(error).toHaveBeenCalledWith(expect.stringContaining("exceeds pruning staleAfter (10s)"));
    error.mockRestore();
  });

  it("keeps entries independent for each request path", async () => {
    await Reflect.apply(enforceRateLimit, undefined, [{}, { max: 1, duration: 60, ban: 0 }]);
    request.path = "/api/contact";

    await expect(
      Reflect.apply(enforceRateLimit, undefined, [{}, { max: 1, duration: 60, ban: 0 }])
    ).resolves.toBeUndefined();
    expect(storageByNamespace).toHaveLength(2);
  });

  it("counts requests from different paths in the global limit", async () => {
    runtimeConfig.simpleRateLimiter.global.enabled = true;
    await Reflect.apply(enforceGlobalRateLimit, undefined, [{}, { max: 2, duration: 60, ban: 0 }]);
    request.path = "/api/contact";
    await Reflect.apply(enforceRateLimit, undefined, [{}, { max: 10, duration: 60, ban: 0 }]);

    await expect(
      Reflect.apply(enforceGlobalRateLimit, undefined, [{}, { max: 2, duration: 60, ban: 0 }])
    ).rejects.toMatchObject({
      data: { bannedUntil: expect.any(Number), limits: { max: 2, duration: 60, ban: 0 } }
    });
  });

  it("uses the end of the active window when global bans are disabled", async () => {
    runtimeConfig.simpleRateLimiter.global.enabled = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:30.000Z"));
    await Reflect.apply(enforceGlobalRateLimit, undefined, [{}, { max: 1, duration: 60, ban: 0 }]);
    vi.setSystemTime(new Date("2026-01-01T00:00:45.000Z"));

    await expect(
      Reflect.apply(enforceGlobalRateLimit, undefined, [{}, { max: 1, duration: 60, ban: 0 }])
    ).rejects.toMatchObject({
      data: { bannedUntil: new Date("2026-01-01T00:01:30.000Z").getTime() }
    });
    vi.useRealTimers();
  });

  it("uses the explicit ban duration for global limits", async () => {
    runtimeConfig.simpleRateLimiter.global.enabled = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:30.000Z"));
    await Reflect.apply(enforceGlobalRateLimit, undefined, [
      {},
      { max: 1, duration: 60, ban: 300 }
    ]);
    vi.setSystemTime(new Date("2026-01-01T00:00:45.000Z"));

    await expect(
      Reflect.apply(enforceGlobalRateLimit, undefined, [{}, { max: 1, duration: 60, ban: 300 }])
    ).rejects.toMatchObject({
      data: { bannedUntil: new Date("2026-01-01T00:05:45.000Z").getTime() }
    });
    vi.useRealTimers();
  });

  it("prunes stale timestamps and expired bans", async () => {
    const storage = new Map<string, unknown>([
      ["stale", { timestamps: [1], bannedUntil: 2 }],
      ["active", { timestamps: [9_500], bannedUntil: 11_000 }],
      ["mixed", { timestamps: [1, 9_500], bannedUntil: 2 }]
    ]);
    storageByNamespace.set("simple-rate-limiter:global", storage);

    await expect(pruneGlobalRateLimitStorage(5, 10_000)).resolves.toEqual({
      scanned: 3,
      pruned: 1,
      retained: 2
    });
    expect(storage.get("stale")).toBeUndefined();
    expect(storage.get("active")).toEqual({ timestamps: [9_500], bannedUntil: 11_000 });
    expect(storage.get("mixed")).toEqual({ timestamps: [9_500] });
  });

  it("handles an empty global store", async () => {
    await expect(pruneGlobalRateLimitStorage(86_400, 10_000)).resolves.toEqual({
      scanned: 0,
      pruned: 0,
      retained: 0
    });
  });
});
