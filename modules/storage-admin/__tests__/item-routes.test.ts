import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { createEvent } from "h3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h3Mocks = vi.hoisted(() => ({
  createError: vi.fn((error: Record<string, unknown>) =>
    Object.assign(new Error(String(error.statusMessage)), error)
  ),
  getRouterParam: vi.fn(),
  readBody: vi.fn()
}));
const { createError, getRouterParam, readBody } = h3Mocks;
const assertStorageAdmin = vi.fn();
const getStorageAdminConfig = vi.fn();
const useAllowedStorage = vi.fn();

vi.mock("h3", async () => ({
  ...(await vi.importActual<typeof import("h3")>("h3")),
  createError: h3Mocks.createError,
  defineEventHandler: (handler: unknown) => handler,
  getRouterParam: h3Mocks.getRouterParam,
  readBody: h3Mocks.readBody
}));
vi.mock("../src/runtime/server/utils/storage-admin", () => ({
  assertStorageAdmin,
  getStorageAdminConfig,
  useAllowedStorage
}));

/**
 * Creates an H3 event suitable for testing a route handler.
 * @returns A minimal H3 event.
 */
function createTestEvent() {
  const request = new IncomingMessage(new Socket());
  return createEvent(request, new ServerResponse(request));
}

describe("storage item routes", () => {
  beforeEach(() => {
    vi.resetModules();
    assertStorageAdmin.mockReset();
    createError.mockClear();
    getRouterParam.mockReset();
    getStorageAdminConfig.mockReset();
    readBody.mockReset();
    useAllowedStorage.mockReset();
    getRouterParam.mockImplementation((_event: unknown, name: string) =>
      name === "mount" ? "cache" : "pages:home"
    );
  });

  it("reads an existing item and reports a missing item", async () => {
    const getItem = vi.fn().mockResolvedValueOnce({ title: "Home" }).mockResolvedValueOnce(null);
    useAllowedStorage.mockReturnValue({ storage: { getItem } });
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/[...key].get"))
      .default;
    const event = createTestEvent();

    await expect(handler(event)).resolves.toEqual({
      data: { key: "pages:home", value: { title: "Home" } }
    });
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 });
    expect(useAllowedStorage).toHaveBeenCalledWith(event, "cache", "read", "pages:home");
  });

  it("validates a read key before accessing storage", async () => {
    getRouterParam.mockReturnValueOnce("cache").mockReturnValueOnce("");
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/[...key].get"))
      .default;

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(useAllowedStorage).not.toHaveBeenCalled();
  });

  it("writes a JSON value only after authorizing the key", async () => {
    const setItem = vi.fn();
    useAllowedStorage.mockReturnValue({ storage: { setItem } });
    readBody.mockResolvedValue({ value: { title: "Updated" } });
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/[...key].put"))
      .default;
    const event = createTestEvent();

    await expect(handler(event)).resolves.toEqual({ data: { key: "pages:home", updated: true } });
    expect(useAllowedStorage).toHaveBeenCalledWith(event, "cache", "write", "pages:home");
    expect(setItem).toHaveBeenCalledWith("pages:home", { title: "Updated" });
  });

  it("rejects an upsert without a JSON value", async () => {
    readBody.mockResolvedValue({});
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/items/[...key].put"))
      .default;

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(useAllowedStorage).not.toHaveBeenCalled();
  });

  it("deletes an authorized item", async () => {
    const removeItem = vi.fn();
    useAllowedStorage.mockReturnValue({ storage: { removeItem } });
    const handler = (
      await import("../src/runtime/server/api/_storage/[mount]/items/[...key].delete")
    ).default;
    const event = createTestEvent();

    await expect(handler(event)).resolves.toEqual({ data: { key: "pages:home", deleted: true } });
    expect(useAllowedStorage).toHaveBeenCalledWith(event, "cache", "delete", "pages:home");
    expect(removeItem).toHaveBeenCalledWith("pages:home");
  });

  it("returns the configured mount and base selectors", async () => {
    const config = {
      mounts: {
        cache: { prefixes: ["pages", "media:videos"] },
        demo: { prefixes: ["drafts"] }
      }
    };
    getStorageAdminConfig.mockReturnValue(config);
    const handler = (await import("../src/runtime/server/api/_storage/config.get")).default;
    const event = createTestEvent();

    expect(handler(event)).toEqual({
      data: {
        mounts: [
          { mount: "cache", prefixes: ["pages", "media:videos"] },
          { mount: "demo", prefixes: ["drafts"] }
        ]
      }
    });
    expect(assertStorageAdmin).toHaveBeenCalledWith(event, config);
  });
});
