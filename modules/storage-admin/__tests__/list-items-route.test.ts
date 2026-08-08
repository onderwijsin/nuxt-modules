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
  assertAllowedPrefix: vi.fn(),
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
});
