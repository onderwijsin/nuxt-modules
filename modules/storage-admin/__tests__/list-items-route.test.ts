import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { createEvent } from "h3";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

/**
 * Creates an H3 event suitable for testing a route handler.
 * @returns A minimal H3 event.
 */
function createTestEvent() {
  const request = new IncomingMessage(new Socket());
  return createEvent(request, new ServerResponse(request));
}

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
          { key: "media:videos:introduction", metadata: null, path: null },
          { key: "pages:home", metadata: null, path: null }
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

  it("limits listing to the requested base and searches its metadata path", async () => {
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

  it("uses the root storage base only when the mount explicitly permits it", async () => {
    getAllowedMount.mockReturnValue({
      config: {
        defaultLimit: 100,
        maxLimit: 500,
        internalKeyPrefixes: [],
        internalKeySuffixes: []
      },
      mount: { prefixes: [], allowRoot: true }
    });
    getKeys.mockResolvedValue(["operations:job"]);
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/index.get"))
      .default;

    await expect(handler(createTestEvent())).resolves.toMatchObject({
      data: { items: [{ key: "operations:job" }], total: 1 }
    });
    expect(getKeys).toHaveBeenCalledWith("");
  });

  it("rejects malformed list parameters before accessing storage", async () => {
    getQuery.mockReturnValue({ limit: "not-a-number" });
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/index.get"))
      .default;

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(useStorage).not.toHaveBeenCalled();
  });
});
