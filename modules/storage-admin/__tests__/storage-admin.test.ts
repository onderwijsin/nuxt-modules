import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../packages/test-utils/src";

const h3Mocks = vi.hoisted(() => ({
  createError: vi.fn((error: Record<string, unknown>) =>
    Object.assign(new Error(String(error.statusMessage)), error)
  )
}));
const { createError } = h3Mocks;
const assertAdminAccess = vi.fn();
const useRuntimeConfig = vi.fn();
const useStorage = vi.fn();

vi.mock("h3", async () => ({
  ...(await vi.importActual<typeof import("h3")>("h3")),
  createError: h3Mocks.createError
}));
vi.mock("nitropack/runtime", () => ({ useRuntimeConfig, useStorage }));
vi.mock("@onderwijsin/nuxt-module-utils/server", () => ({ assertAdminAccess }));

describe("storage-admin runtime access", () => {
  beforeEach(() => {
    vi.resetModules();
    createError.mockClear();
    assertAdminAccess.mockReset();
    useRuntimeConfig.mockReset();
    useStorage.mockReset();
    useRuntimeConfig.mockReturnValue({
      storageAdmin: {
        enabled: true,
        adminToken: "token",
        adminHeaderName: "x-admin-token",
        devAuthBypass: false,
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
        maxLimit: 500,
        maxListedKeys: 10_000
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

  it.each(["toString", "constructor", "__proto__"])(
    "rejects inherited mount name %s",
    async (mountName) => {
      const { getAllowedMount } = await import("../src/runtime/server/utils/storage-admin");

      expect(() => getAllowedMount(createTestEvent(), mountName, "read")).toThrow();
      expect(createError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          statusMessage: "Storage mount is not configured"
        })
      );
    }
  );

  it("requires authentication when the development bypass is disabled", async () => {
    assertAdminAccess.mockImplementation(() => {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    });
    const { getAllowedMount } = await import("../src/runtime/server/utils/storage-admin");

    expect(() => getAllowedMount(createTestEvent(), "cache", "read")).toThrow();
    expect(createError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, statusMessage: "Unauthorized" })
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
        devAuthBypass: false,
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
        maxLimit: 500,
        maxListedKeys: 10_000
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
