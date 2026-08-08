import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { createEvent } from "h3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h3Mocks = vi.hoisted(() => ({
  createError: vi.fn((error: Record<string, unknown>) =>
    Object.assign(new Error(String(error.statusMessage)), error)
  )
}));
const { createError } = h3Mocks;
const isAdmin = vi.fn();
const useRuntimeConfig = vi.fn();
const useStorage = vi.fn();

vi.mock("h3", async () => ({
  ...(await vi.importActual<typeof import("h3")>("h3")),
  createError: h3Mocks.createError
}));
vi.mock("nitropack/runtime", () => ({ useRuntimeConfig, useStorage }));
vi.mock("@onderwijsin/nuxt-module-utils/server", () => ({ isAdmin }));

/**
 * Creates an H3 event suitable for runtime utility tests.
 * @returns A minimal H3 event.
 */
function createTestEvent() {
  const request = new IncomingMessage(new Socket());
  return createEvent(request, new ServerResponse(request));
}

describe("storage-admin runtime access", () => {
  beforeEach(() => {
    vi.resetModules();
    createError.mockClear();
    isAdmin.mockReset();
    useRuntimeConfig.mockReset();
    useStorage.mockReset();
    isAdmin.mockReturnValue(true);
    useRuntimeConfig.mockReturnValue({
      storageAdmin: {
        enabled: true,
        adminToken: "token",
        adminHeaderName: "x-admin-token",
        internalKeyPrefixes: ["__cache_meta:"],
        internalKeySuffixes: ["$"],
        mounts: {
          cache: {
            permissions: ["read", "delete"],
            prefixes: ["kennisbank:articles"],
            allowRoot: false
          }
        },
        defaultLimit: 100,
        maxLimit: 500
      }
    });
  });

  it("allows a configured prefix and resolves its storage mount", async () => {
    const storage = {};
    useStorage.mockReturnValue(storage);
    const { useAllowedStorage } = await import("../src/runtime/server/utils/storage-admin");
    const event = createTestEvent();

    expect(useAllowedStorage(event, "cache", "read", "kennisbank:articles:example")).toEqual({
      config: expect.objectContaining({ defaultLimit: 100 }),
      storage
    });
    expect(useStorage).toHaveBeenCalledWith("cache");
  });

  it("rejects a key outside the configured prefixes", async () => {
    const { useAllowedStorage } = await import("../src/runtime/server/utils/storage-admin");
    const event = createTestEvent();

    expect(() => useAllowedStorage(event, "cache", "read", "pages:home")).toThrow();
    expect(createError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, statusMessage: "Storage prefix is not permitted" })
    );
  });

  it("rejects an operation not granted to the mount", async () => {
    const { useAllowedStorage } = await import("../src/runtime/server/utils/storage-admin");
    const event = createTestEvent();

    expect(() => useAllowedStorage(event, "cache", "write", "kennisbank:articles")).toThrow();
    expect(createError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        statusMessage: "Storage operation is not permitted"
      })
    );
  });

  it("does not expose cache metadata keys", async () => {
    const { useAllowedStorage } = await import("../src/runtime/server/utils/storage-admin");
    const event = createTestEvent();

    expect(() => useAllowedStorage(event, "cache", "read", "kennisbank:articles:item$")).toThrow();
    expect(createError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        statusMessage: "Internal storage metadata is not exposed"
      })
    );
  });

  it("uses configured internal key prefixes", async () => {
    useRuntimeConfig.mockReturnValue({
      storageAdmin: {
        enabled: true,
        adminToken: "token",
        adminHeaderName: "x-admin-token",
        internalKeyPrefixes: ["__private:"],
        internalKeySuffixes: [],
        mounts: {
          cache: {
            permissions: ["read"],
            prefixes: ["kennisbank:articles"],
            allowRoot: false
          }
        },
        ui: { enabled: true, path: "/_storage" },
        defaultLimit: 100,
        maxLimit: 500
      }
    });
    const { useAllowedStorage } = await import("../src/runtime/server/utils/storage-admin");
    const event = createTestEvent();

    expect(() => useAllowedStorage(event, "cache", "read", "__private:token")).toThrow();
    expect(() =>
      useAllowedStorage(event, "cache", "read", "kennisbank:articles:item$")
    ).not.toThrow();
  });
});
