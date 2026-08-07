import { beforeEach, describe, expect, it, vi } from "vitest";

const storageByNamespace = vi.hoisted(() => new Map<string, Map<string, unknown>>());
const request = vi.hoisted(() => ({ ip: "192.0.2.1", path: "/api/newsletter/signup" }));

vi.mock("h3", () => ({
  createError: ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }),
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

import { enforceRateLimit } from "../src/runtime";

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

    const result = await Reflect.apply(enforceRateLimit, undefined, [{}, config]);

    expect(result.bannedUntil).toEqual(expect.any(Number));
  });

  it("keeps entries independent for each request path", async () => {
    await Reflect.apply(enforceRateLimit, undefined, [{}, { max: 1, duration: 60, ban: 0 }]);
    request.path = "/api/contact";

    await expect(
      Reflect.apply(enforceRateLimit, undefined, [{}, { max: 1, duration: 60, ban: 0 }])
    ).resolves.toEqual({});
    expect(storageByNamespace).toHaveLength(2);
  });
});
