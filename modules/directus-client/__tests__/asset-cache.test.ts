import { createServer } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CachedEventHandler, HTTPEvent } from "ocache";

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
  return { rootStorage, storage, values };
});

vi.mock("nitropack/runtime", () => ({
  useStorage: (mount?: string) => (mount ? state.storage : state.rootStorage)
}));

const { createAssetCacheState, createAssetCacheStorage, getOrCreateAssetCacheHandler } =
  await import("../src/runtime/assets/cache");
const { fetchDirectusAsset } = await import("../src/runtime/assets/transport");

let resolveAnonymous: (event: HTTPEvent) => Promise<Response>;
let stateForTest: ReturnType<typeof createAssetCacheState>;
let handler: CachedEventHandler<HTTPEvent>;
const cacheConfig = {
  enabled: true,
  storage: "directus-assets",
  maxAge: 60,
  maxBodySize: 10 * 1024 * 1024,
  swr: false
};

describe("Directus asset cache", () => {
  beforeEach(() => {
    state.values.clear();
    resolveAnonymous = async () =>
      new Response(new Uint8Array([1, 2, 3]), { headers: { "cache-control": "public" } });
    stateForTest = createAssetCacheState();
    handler = getOrCreateAssetCacheHandler(stateForTest, cacheConfig, (event) =>
      resolveAnonymous(event)
    );
  });

  it("reuses a handler within state and isolates different application state", () => {
    expect(getOrCreateAssetCacheHandler(stateForTest, cacheConfig, resolveAnonymous)).toBe(handler);
    expect(
      getOrCreateAssetCacheHandler(createAssetCacheState(), cacheConfig, resolveAnonymous)
    ).not.toBe(handler);
  });

  it("fails when the configured Nitro storage mount is missing", async () => {
    const getMount = state.rootStorage.getMount;
    state.rootStorage.getMount = () => ({});

    const storage = createAssetCacheStorage("missing-assets");
    await expect(storage.get("asset")).rejects.toThrow(
      'Directus asset cache storage mount "missing-assets" is not configured'
    );

    state.rootStorage.getMount = getMount;
  });

  it("bypasses the cache for unsupported preconditions and forwards them upstream", async () => {
    const receivedHeaders: Headers[] = [];
    resolveAnonymous = async (event) => {
      receivedHeaders.push(new Headers(event.req.headers));
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "cache-control": "public" } });
    };
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

  it("stores Directus responses after normalizing variance to the cache key", async () => {
    let upstreamCalls = 0;
    const server = createServer((_request, response) => {
      upstreamCalls += 1;
      response.writeHead(200, {
        "cache-control": "public, max-age=2592000",
        "content-type": "image/svg+xml",
        vary: "Accept-Encoding, Origin, Cache-Control, accept"
      });
      response.end("asset");
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server has no address");
      resolveAnonymous = (event) =>
        fetchDirectusAsset(event.req.url, {
          method: "GET",
          headers: new Headers(event.req.headers)
        });
      const pending: Promise<unknown>[] = [];
      const request = (accept: string) => ({
        req: Object.assign(
          new Request(`http://127.0.0.1:${address.port}/assets/logo?width=400`, {
            headers: { accept }
          }),
          { waitUntil: (promise: Promise<unknown>) => pending.push(promise) }
        ),
        url: new URL(`http://127.0.0.1:${address.port}/assets/logo?width=400`)
      });

      const first = await handler(request("image/avif"));
      await Promise.all(pending.splice(0));
      const second = await handler(request("image/avif"));
      await Promise.all(pending.splice(0));
      expect(upstreamCalls).toBe(1);
      const differentAccept = await handler(request("image/webp"));
      await Promise.all(pending.splice(0));

      expect(first.headers.get("x-directus-asset-cache")).toBe("MISS");
      expect(second.headers.get("x-directus-asset-cache")).toBe("HIT");
      expect(differentAccept.headers.get("x-directus-asset-cache")).toBe("MISS");
      expect(upstreamCalls).toBe(2);
      expect(state.values.size).toBeGreaterThan(0);
      expect(first.headers.get("vary")).toBe("Accept");
      expect(second.headers.get("vary")).toBe("Accept");
      expect(differentAccept.headers.get("vary")).toBe("Accept");
      expect(first.headers.get("vary")).not.toContain("Origin");
      expect(first.headers.get("vary")).not.toContain("Cache-Control");
      expect(first.headers.get("vary")).not.toContain("Accept-Encoding");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });
});
