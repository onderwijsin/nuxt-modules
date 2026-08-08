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
});
