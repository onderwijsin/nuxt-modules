import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../packages/test-utils/src";

const h3Mocks = vi.hoisted(() => ({
  createError: vi.fn((error: Record<string, unknown>) => Object.assign(new Error(), error)),
  getQuery: vi.fn(),
  getRouterParam: vi.fn()
}));
const { getQuery, getRouterParam } = h3Mocks;
const assertAllowedPrefix = vi.fn();
const getAllowedMount = vi.fn();
const getKeys = vi.fn();
const useStorage = vi.fn();

vi.mock("h3", async () => ({
  ...(await vi.importActual<typeof import("h3")>("h3")),
  createError: h3Mocks.createError,
  defineEventHandler: (handler: unknown) => handler,
  getQuery: h3Mocks.getQuery,
  getRouterParam: h3Mocks.getRouterParam
}));
vi.mock("nitropack/runtime", () => ({ useStorage }));
vi.mock("../src/runtime/server/utils/storage-admin", () => ({
  assertAllowedPrefix,
  getAllowedMount,
  isInternalStorageKey: (_config: unknown, key: string) => key.endsWith("$")
}));

describe("storage item list route", () => {
  beforeEach(() => {
    vi.resetModules();
    assertAllowedPrefix.mockReset();
    getAllowedMount.mockReset();
    getKeys.mockReset();
    getQuery.mockReset();
    getRouterParam.mockReset();
    useStorage.mockReset();

    getRouterParam.mockReturnValue("cache");
    getQuery.mockReturnValue({ page: "1" });
    getAllowedMount.mockReturnValue({
      config: {
        defaultLimit: 100,
        maxLimit: 500,
        maxListedKeys: 10_000,
        internalKeyPrefixes: ["__cache_meta:"],
        internalKeySuffixes: ["$"]
      },
      mount: { prefixes: ["pages", "media:videos"], allowRoot: false }
    });
    useStorage.mockReturnValue({ getKeys, getMeta: vi.fn() });
  });

  it("aggregates configured bases when no base filter is supplied", async () => {
    getKeys.mockImplementation((base: string) => {
      if (base === "pages") return Promise.resolve(["pages:home", "pages:home$"]);
      return Promise.resolve(["media:videos:introduction"]);
    });
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/index.get"))
      .default;

    await expect(handler(createTestEvent())).resolves.toEqual({
      data: {
        items: [
          { key: "media:videos:introduction", path: null },
          { key: "pages:home", path: null }
        ],
        nextCursor: null,
        page: 1,
        total: 2
      }
    });
    expect(useStorage).toHaveBeenCalledWith("cache");
    expect(getKeys).toHaveBeenCalledWith("pages");
    expect(getKeys).toHaveBeenCalledWith("media:videos");
  });

  it("returns a string cursor that can fetch the next page", async () => {
    getAllowedMount.mockReturnValue({
      config: {
        defaultLimit: 2,
        maxLimit: 500,
        maxListedKeys: 10_000,
        internalKeyPrefixes: [],
        internalKeySuffixes: []
      },
      mount: { prefixes: ["pages"], allowRoot: false }
    });
    getQuery.mockReturnValue({ prefix: "pages" });
    getKeys.mockResolvedValue(["pages:a", "pages:b", "pages:c"]);
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/index.get"))
      .default;

    const firstPage = await handler(createTestEvent());
    expect(firstPage.data.items.map((entry) => entry.key)).toEqual(["pages:a", "pages:b"]);
    expect(firstPage.data.nextCursor).toBe("pages:b");

    getQuery.mockReturnValue({ prefix: "pages", cursor: firstPage.data.nextCursor });
    const secondPage = await handler(createTestEvent());
    expect(secondPage.data.items.map((entry) => entry.key)).toEqual(["pages:c"]);
    expect(secondPage.data.nextCursor).toBeNull();
  });

  it("limits listing to the requested base and searches its cached path", async () => {
    const getMeta = vi
      .fn()
      .mockResolvedValueOnce({ path: "/welcome" })
      .mockResolvedValueOnce({ path: "/about" });
    getQuery.mockReturnValue({ prefix: "pages", page: "1", search: "welcome" });
    getKeys.mockResolvedValue(["pages:home", "pages:about"]);
    useStorage.mockReturnValue({ getKeys, getMeta });
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/index.get"))
      .default;
    const event = createTestEvent();

    await expect(handler(event)).resolves.toMatchObject({
      data: { items: [{ key: "pages:about", path: "/welcome" }], total: 1 }
    });
    expect(assertAllowedPrefix).toHaveBeenCalledWith(expect.anything(), expect.anything(), "pages");
    expect(getKeys).toHaveBeenCalledWith("pages");
    expect(getMeta).toHaveBeenCalledTimes(2);
  });

  it("rejects an unbounded root listing even when the mount permits root operations", async () => {
    getAllowedMount.mockReturnValue({
      config: {
        defaultLimit: 100,
        maxLimit: 500,
        maxListedKeys: 10_000,
        internalKeyPrefixes: [],
        internalKeySuffixes: []
      },
      mount: { prefixes: [], allowRoot: true }
    });
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/index.get"))
      .default;

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(getKeys).not.toHaveBeenCalled();
  });

  it("loads metadata only for the requested page when no search is active", async () => {
    const getMeta = vi.fn().mockResolvedValue({ path: "/cached-page" });
    getQuery.mockReturnValue({ prefix: "pages", limit: "2", metadata: "true" });
    getKeys.mockResolvedValue(["pages:a", "pages:b", "pages:c"]);
    useStorage.mockReturnValue({ getKeys, getMeta });
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/index.get"))
      .default;

    await expect(handler(createTestEvent())).resolves.toMatchObject({
      data: { total: 3, items: [{ key: "pages:a" }, { key: "pages:b" }] }
    });
    expect(getMeta).toHaveBeenCalledTimes(2);
  });

  it("returns only path metadata by default and exposes raw metadata on request", async () => {
    const getMeta = vi.fn().mockResolvedValue({ path: "/cached-page", providerToken: "private" });
    getQuery.mockReturnValue({ prefix: "pages" });
    getKeys.mockResolvedValue(["pages:a"]);
    useStorage.mockReturnValue({ getKeys, getMeta });
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/index.get"))
      .default;

    await expect(handler(createTestEvent())).resolves.toEqual({
      data: {
        items: [{ key: "pages:a", path: "/cached-page" }],
        nextCursor: null,
        page: null,
        total: 1
      }
    });

    getQuery.mockReturnValue({ prefix: "pages", metadata: "true" });
    await expect(handler(createTestEvent())).resolves.toMatchObject({
      data: { items: [{ metadata: { path: "/cached-page", providerToken: "private" } }] }
    });
  });

  it("rejects a large post-enumeration result before loading metadata", async () => {
    const getMeta = vi.fn();
    getAllowedMount.mockReturnValue({
      config: {
        defaultLimit: 100,
        maxLimit: 500,
        maxListedKeys: 10_000,
        internalKeyPrefixes: [],
        internalKeySuffixes: []
      },
      mount: { prefixes: ["pages"], allowRoot: false }
    });
    getQuery.mockReturnValue({ prefix: "pages", search: "cached" });
    getKeys.mockResolvedValue(Array.from({ length: 10_001 }, (_, index) => `pages:${index}`));
    useStorage.mockReturnValue({ getKeys, getMeta });
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/index.get"))
      .default;

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 413 });
    expect(getMeta).not.toHaveBeenCalled();
  });

  it("returns a service-unavailable response when key listing fails", async () => {
    getKeys.mockRejectedValue(new Error("provider unavailable"));
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/index.get"))
      .default;

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 503 });
  });

  it("rejects malformed list parameters before accessing storage", async () => {
    getQuery.mockReturnValue({ limit: "not-a-number" });
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/index.get"))
      .default;

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(useStorage).not.toHaveBeenCalled();
  });
});
