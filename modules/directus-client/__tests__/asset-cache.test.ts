import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const values = new Map<string, Uint8Array>();
  const storage = {
    getItemRaw: async (key: string) => values.get(key),
    removeItem: async (key: string) => {
      values.delete(key);
    },
    setItemRaw: async (key: string, value: Uint8Array) => {
      values.set(key, value);
    }
  };
  const rootStorage = {
    getMount: (mount: string) => (mount === "directus-assets" ? { base: "/configured" } : {})
  };
  return { rootStorage, storage };
});

vi.mock("nitropack/runtime", () => ({
  useStorage: (mount?: string) => (mount ? state.storage : state.rootStorage)
}));

const { createAssetCacheStorage, getAssetCacheHandler } =
  await import("../src/runtime/server/utils/asset-cache");

describe("Directus asset cache", () => {
  it("fails when the configured Nitro storage mount is missing", () => {
    const getMount = state.rootStorage.getMount;
    state.rootStorage.getMount = () => ({});

    expect(() => createAssetCacheStorage("missing-assets")).toThrow(
      'Directus asset cache storage mount "missing-assets" is not configured'
    );

    state.rootStorage.getMount = getMount;
  });

  it("bypasses the cache for unsupported preconditions and forwards them upstream", async () => {
    const receivedHeaders: Headers[] = [];
    const handler = getAssetCacheHandler(
      { storage: "directus-assets", maxAge: 60, maxBodySize: 10 * 1024 * 1024, swr: false },
      async (event) => {
        receivedHeaders.push(new Headers(event.req.headers));
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { "cache-control": "public" }
        });
      }
    );
    const request = (headers?: HeadersInit) => ({
      req: new Request("https://app.example.test/_directus/assets/logo?width=400", { headers }),
      url: new URL("https://app.example.test/_directus/assets/logo?width=400")
    });

    await (await handler(request())).arrayBuffer();
    await (await handler(request({ "if-match": "match-validator" }))).arrayBuffer();
    await (await handler(request({ "if-unmodified-since": "date-validator" }))).arrayBuffer();

    expect(receivedHeaders).toHaveLength(3);
    expect(receivedHeaders[1]?.get("if-match")).toBe("match-validator");
    expect(receivedHeaders[2]?.get("if-unmodified-since")).toBe("date-validator");
  });
});
