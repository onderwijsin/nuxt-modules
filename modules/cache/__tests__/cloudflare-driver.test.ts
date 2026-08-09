import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { bulkDeleteRequest, createClient } = vi.hoisted(() => {
  const bulkDeleteRequest = vi.fn();
  const createClient = vi.fn(() => bulkDeleteRequest);

  return { bulkDeleteRequest, createClient };
});

vi.mock("ofetch", () => ({ ofetch: { create: createClient } }));

import {
  bulkDeleteCloudflareCacheKeys,
  createCloudflareCacheDriver,
  getCacheIndexKey
} from "../src/runtime";

const cloudflareCredentials = {
  accountId: "account",
  kvApiToken: "token",
  cacheNamespaceId: "namespace"
};

describe("Cloudflare cache driver", () => {
  beforeEach(() => {
    bulkDeleteRequest.mockReset();
    createClient.mockClear();
    bulkDeleteRequest.mockResolvedValue({ success: true });
  });

  it("bulk deletes values, metadata, and indexes for a cache base", async () => {
    const path = "/kennisbank/artikelen/example";
    const key = "kennisbank:articles:example:abc123";
    const driver = createCloudflareCacheDriver(memoryDriver(), {
      ...cloudflareCredentials,
      getRequestPath: () => path
    });
    const storage = createStorage({ driver });
    await storage.setItem(key, { title: "Example" });

    await driver.clear?.("kennisbank:articles", {});

    expect(createClient).toHaveBeenCalledWith({
      baseURL: "https://api.cloudflare.com/client/v4/accounts/account",
      headers: { Authorization: "Bearer token" }
    });
    expect(bulkDeleteRequest).toHaveBeenCalledWith(
      "/storage/kv/namespaces/namespace/bulk/delete",
      expect.objectContaining({ method: "POST" })
    );
    expect(bulkDeleteRequest.mock.calls[0]?.[1].body).toEqual(
      expect.arrayContaining([key, `${key}$`, getCacheIndexKey("kennisbank:articles", path, key)])
    );
  });

  it("chunks Cloudflare bulk deletion requests at the documented API limit", async () => {
    const keys = Array.from({ length: 10_001 }, (_, index) => `cache-entry-${index}`);

    await bulkDeleteCloudflareCacheKeys(keys, cloudflareCredentials);

    expect(bulkDeleteRequest).toHaveBeenCalledTimes(2);
    expect(bulkDeleteRequest.mock.calls[0]?.[1].body).toHaveLength(10_000);
    expect(bulkDeleteRequest.mock.calls[1]?.[1].body).toEqual(["cache-entry-10000"]);
  });

  it("rejects incomplete Cloudflare credentials", () => {
    expect(() =>
      createCloudflareCacheDriver(memoryDriver(), {
        accountId: "account",
        kvApiToken: "",
        cacheNamespaceId: "namespace"
      })
    ).toThrow();
  });
});
