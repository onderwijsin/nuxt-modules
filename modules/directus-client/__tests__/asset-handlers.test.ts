import { createServer } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../packages/test-utils/src";
import { createAssetCacheState } from "../src/runtime/assets/cache";

const runtime = vi.hoisted(() => ({
  app: { directusAssetCache: {} },
  config: null as unknown,
  proxy: vi.fn(
    async (
      _event: unknown,
      target: string,
      options: { fetch: typeof fetch; fetchOptions: RequestInit }
    ) => options.fetch(target, options.fetchOptions)
  ),
  storageValues: new Map<string, Uint8Array>()
}));

vi.mock("#imports", () => ({ useRuntimeConfig: () => runtime.config }));
vi.mock("nitropack/runtime", () => ({
  useNitroApp: () => runtime.app,
  useStorage: (mount?: string) =>
    mount
      ? {
          getItemRaw: async (key: string) => runtime.storageValues.get(key),
          removeItem: async (key: string) => void runtime.storageValues.delete(key),
          setItemRaw: async (key: string, value: Uint8Array) =>
            void runtime.storageValues.set(key, value)
        }
      : { getMount: () => ({ base: "/configured" }) }
}));
vi.mock("h3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("h3")>()),
  sendProxy: runtime.proxy
}));

const uncachedHandler = (await import("../src/runtime/assets/uncached-handler")).default;
const cachedHandler = (await import("../src/runtime/assets/cached-handler")).default;

function configure(baseUrl: string, cacheEnabled: boolean) {
  runtime.config = {
    directusClient: {
      baseUrl,
      auth: { enabled: true },
      assets: {
        enabled: true,
        publicOnly: false,
        url: undefined,
        cache: {
          enabled: cacheEnabled,
          storage: "directus-assets",
          maxAge: 60,
          maxBodySize: 10 * 1024 * 1024,
          swr: false,
          staleMaxAge: undefined,
          prune: { enabled: false, onRequest: true, interval: 3600 }
        }
      }
    },
    public: { directusClient: { assets: { path: "/_directus/assets" } } }
  };
}

function prepareEvent(method: "GET" | "HEAD") {
  const event = createTestEvent();
  Object.assign(event, { waitUntil: (_promise: Promise<unknown>) => undefined });
  event.node.req.method = method;
  event.node.req.url = "/_directus/assets/logo?width=400";
  event.node.req.headers = {
    accept: "image/svg+xml",
    authorization: "Bearer client-token",
    cookie: "session=secret",
    referer: "https://app.example.test/page"
  };
  return event;
}

async function listen(
  handler: (
    request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse
  ) => void
) {
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no address");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

describe("Directus asset handler boundaries", () => {
  beforeEach(() => {
    runtime.proxy.mockClear();
    runtime.storageValues.clear();
    runtime.app.directusAssetCache = createAssetCacheState();
  });

  it.each(["GET", "HEAD"] as const)(
    "delivers an anonymous %s response through sendProxy",
    async (method) => {
      const requests: import("node:http").IncomingHttpHeaders[] = [];
      const { server, baseUrl } = await listen((request, response) => {
        requests.push(request.headers);
        response.writeHead(200, { "cache-control": "public", "content-type": "image/svg+xml" });
        response.end(method === "HEAD" ? undefined : "asset");
      });
      configure(baseUrl, false);
      try {
        const response = await uncachedHandler(prepareEvent(method));
        expect(runtime.proxy).toHaveBeenCalledOnce();
        expect(response).toBeInstanceOf(Response);
        expect(response.headers.get("content-type")).toBe("image/svg+xml");
        expect(await response.text()).toBe(method === "HEAD" ? "" : "asset");
        expect(requests[0]?.authorization).toBeUndefined();
        expect(requests[0]?.cookie).toBeUndefined();
        expect(requests[0]?.referer).toBeUndefined();
        expect(requests[0]?.accept).toBe("image/svg+xml");
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
      }
    }
  );

  it.each([401, 403])("retries an uncached %s response once with session auth", async (status) => {
    let calls = 0;
    const { server, baseUrl } = await listen((request, response) => {
      calls += 1;
      response.writeHead(request.headers.authorization ? 200 : status, {
        "cache-control": "public",
        "content-type": "image/svg+xml",
        "content-length": "5",
        "set-cookie": "secret=1",
        "x-upstream": "kept"
      });
      response.end(request.headers.authorization ? "asset" : "denied");
    });
    configure(baseUrl, false);
    const event = prepareEvent("GET");
    event.context.directusAuth = {
      resolve: async () => ({ accessToken: "session-token", snapshot: null })
    };
    try {
      const response = await uncachedHandler(event);
      expect(calls).toBe(2);
      expect(runtime.proxy).toHaveBeenCalledOnce();
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("content-length")).toBeNull();
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(response.headers.get("x-upstream")).toBe("kept");
      expect(await response.text()).toBe("asset");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });

  it.each(["GET", "HEAD"] as const)(
    "keeps authenticated %s fallbacks outside the shared cache",
    async (method) => {
      let calls = 0;
      const { server, baseUrl } = await listen((request, response) => {
        calls += 1;
        response.writeHead(request.headers.authorization ? 200 : 403, {
          "cache-control": "public",
          "content-type": "image/svg+xml"
        });
        response.end("asset");
      });
      configure(baseUrl, true);
      try {
        for (let index = 0; index < 2; index += 1) {
          const event = prepareEvent(method);
          event.context.directusAuth = {
            resolve: async () => ({ accessToken: "session-token", snapshot: null })
          };
          const response = await cachedHandler(event);
          expect(response.headers.get("cache-control")).toBe("private, no-store");
        }
        expect(calls).toBe(4);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
      }
    }
  );

  it.each(["GET", "HEAD"] as const)(
    "caches an anonymous %s response at the handler boundary",
    async (method) => {
      let calls = 0;
      const { server, baseUrl } = await listen((_request, response) => {
        calls += 1;
        response.writeHead(200, { "cache-control": "public", "content-type": "image/svg+xml" });
        response.end("asset");
      });
      configure(baseUrl, true);
      try {
        await cachedHandler(prepareEvent(method));
        await cachedHandler(prepareEvent(method));
        expect(calls).toBe(1);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
      }
    }
  );
});
