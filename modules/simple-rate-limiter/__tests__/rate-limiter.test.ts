import { beforeEach, describe, expect, it, vi } from "vitest";

const storageByNamespace = vi.hoisted(() => new Map<string, Map<string, unknown>>());
const request = vi.hoisted(() => ({ ip: "192.0.2.1", path: "/api/newsletter/signup" }));

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
  useStorage: (namespace: string) => {
    const entries = storageByNamespace.get(namespace) ?? new Map<string, unknown>();
    storageByNamespace.set(namespace, entries);
    return {
      getItem: async (key: string) => entries.get(key),
      setItem: async (key: string, value: unknown) => entries.set(key, value)
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

const config = { max: 2, duration: 60, ban: 900 };

describe("enforceRateLimit", () => {
  beforeEach(() => {
    storageByNamespace.clear();
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

  it("keeps entries independent for each request path", async () => {
    await Reflect.apply(enforceRateLimit, undefined, [{}, { max: 1, duration: 60, ban: 0 }]);
    request.path = "/api/contact";

    await expect(
      Reflect.apply(enforceRateLimit, undefined, [{}, { max: 1, duration: 60, ban: 0 }])
    ).resolves.toBeUndefined();
    expect(storageByNamespace).toHaveLength(3);
  });

  it("counts requests from different paths in the global limit", async () => {
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
});
