import { createServer } from "node:http";
import { describe, expect, it } from "vitest";

import { requiresDirectusProxySameOrigin } from "../src/runtime/proxy/handler";
import {
  createSanitizedProxyFetch,
  getForwardedProxyHeaders
} from "../src/runtime/proxy/transport";
import { fetchDirectusAsset } from "../src/runtime/assets/transport";
import { resolveDirectusAssetUrl } from "../src/runtime/assets/url";
import { resolveDirectusUpstreamUrl } from "../src/runtime/core/upstream-url";
import { assertDirectusSameOrigin } from "../src/runtime/core/same-origin";
import {
  getDirectusAuthorizationHeader,
  resolveDirectusCredential
} from "../src/runtime/client/server/request-context";

describe("Directus proxy boundary", () => {
  it("normalizes transport headers while preserving upstream HTTP errors", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(500, {
        "cache-control": "no-store",
        "content-encoding": "gzip",
        "content-length": "3",
        "content-range": "bytes 0-2/3"
      });
      response.end("bad");
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server has no address");
      const response = await fetchDirectusAsset(`http://127.0.0.1:${address.port}`, {
        method: "GET",
        headers: new Headers()
      });

      expect(response.status).toBe(500);
      expect(response.headers.get("content-encoding")).toBeNull();
      expect(response.headers.get("content-length")).toBeNull();
      expect(response.headers.get("content-range")).toBe("bytes 0-2/3");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });

  it("maps transport failures to 502 Bad Gateway", async () => {
    const server = createServer();
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server has no address");
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );

    await expect(
      fetchDirectusAsset(`http://127.0.0.1:${address.port}`, {
        method: "GET",
        headers: new Headers()
      })
    ).rejects.toMatchObject({ statusCode: 502, statusMessage: "Bad Gateway" });
  });

  it("keeps asset requests below the Directus assets prefix", () => {
    expect(
      resolveDirectusAssetUrl({
        baseUrl: "https://cms.example.test/directus/",
        proxyPath: "/_directus/assets",
        requestUrl: new URL("https://app.example.test/_directus/assets/file-id?width=800&fit=cover")
      })
    ).toBe("https://cms.example.test/directus/assets/file-id?width=800&fit=cover");
    expect(() =>
      resolveDirectusAssetUrl({
        baseUrl: "https://cms.example.test",
        proxyPath: "/_directus/assets",
        requestUrl: new URL("https://app.example.test/_directus/assets/../admin")
      })
    ).toThrow(/Invalid Directus proxy path/);
  });

  it("uses a custom asset upstream base URL", () => {
    expect(
      resolveDirectusAssetUrl({
        baseUrl: "https://cms.example.test",
        proxyPath: "/_directus/assets",
        requestUrl: new URL("https://app.example.test/_directus/assets/file-id?width=800"),
        assetUrl: "https://assets.example.test"
      })
    ).toBe("https://assets.example.test/file-id?width=800");
  });
  it("requires same-origin metadata for every server-selected credential", () => {
    expect(requiresDirectusProxySameOrigin({ source: "none" })).toBe(false);
    expect(requiresDirectusProxySameOrigin({ source: "session", accessToken: "session" })).toBe(
      true
    );
    expect(requiresDirectusProxySameOrigin({ source: "proxy", accessToken: "proxy" })).toBe(true);
    expect(requiresDirectusProxySameOrigin({ source: "preview", accessToken: "preview" })).toBe(
      true
    );
  });

  it("joins the configured Directus base path and preserves queries", () => {
    expect(
      resolveDirectusUpstreamUrl(
        "https://cms.example.test/directus/",
        "/_directus/proxy",
        new URL("https://app.example.test/_directus/proxy/items/articles?limit=1")
      )
    ).toBe("https://cms.example.test/directus/items/articles?limit=1");
  });

  it("rejects malformed or traversing upstream paths", () => {
    expect(() =>
      resolveDirectusUpstreamUrl(
        "https://cms.example.test",
        "/_directus/proxy",
        new URL("https://app.example.test/_directus/proxy/%E0%A4%A")
      )
    ).toThrow(/Malformed/);

    expect(() =>
      resolveDirectusUpstreamUrl(
        "https://cms.example.test",
        "/_directus/proxy",
        new URL("https://app.example.test/_directus/proxy/../admin")
      )
    ).toThrow(/Invalid Directus proxy path/);

    expect(() =>
      resolveDirectusUpstreamUrl(
        "ftp://cms.example.test",
        "/_directus/proxy",
        new URL("https://app.example.test/_directus/proxy/items")
      )
    ).toThrow(/must use HTTP/);

    expect(() =>
      resolveDirectusUpstreamUrl(
        "not-a-url",
        "/_directus/proxy",
        new URL("https://app.example.test/_directus/proxy/items")
      )
    ).toThrow(/must use HTTP/);

    for (const path of ["%2e%2e/admin", "%2E%2E/admin", "%252e%252e/admin"]) {
      expect(() =>
        resolveDirectusUpstreamUrl(
          "https://cms.example.test/directus",
          "/_directus/proxy",
          new URL(`https://app.example.test/_directus/proxy/${path}`)
        )
      ).toThrow(/Invalid Directus proxy path/);
    }
  });

  it("allows REST headers while excluding credential, referer, and proxy identity headers", () => {
    expect(getForwardedProxyHeaders()).toEqual(
      expect.arrayContaining(["accept", "content-type", "if-none-match", "prefer"])
    );
    expect(getForwardedProxyHeaders()).not.toEqual(
      expect.arrayContaining(["authorization", "cookie", "referer", "forwarded", "x-real-ip"])
    );
  });

  it.each([400, 401, 403, 404, 409, 429, 500, 503])(
    "preserves upstream HTTP status %s and body while sanitizing both header directions",
    async (status) => {
      const receivedHeaders: Record<string, string | undefined> = {};
      const server = createServer((request, response) => {
        for (const header of ["accept", "referer", "forwarded", "x-forwarded-for", "x-real-ip"])
          receivedHeaders[header] = request.headers[header];
        response.writeHead(status, {
          "content-type": "text/plain",
          "access-control-allow-origin": "https://attacker.example",
          "x-upstream": "safe"
        });
        response.end(`status-${status}`);
      });

      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });

      try {
        const address = server.address();
        if (!address || typeof address === "string")
          throw new Error("Test server did not expose a port");
        const response = await createSanitizedProxyFetch({
          source: "proxy",
          accessToken: "server-token"
        })(`http://127.0.0.1:${address.port}`, {
          headers: {
            accept: "application/json",
            referer: "https://app.test/?preview=true&token=secret",
            forwarded: "for=attacker",
            "x-forwarded-for": "127.0.0.1",
            "x-real-ip": "127.0.0.1"
          }
        });

        expect(response.status).toBe(status);
        await expect(response.text()).resolves.toBe(`status-${status}`);
        expect(response.headers.get("access-control-allow-origin")).toBeNull();
        expect(response.headers.get("x-upstream")).toBe("safe");
        expect(receivedHeaders.accept).toBe("application/json");
        expect(receivedHeaders.referer).toBeUndefined();
        expect(receivedHeaders.forwarded).toBeUndefined();
        expect(receivedHeaders["x-forwarded-for"]).toBeUndefined();
        expect(receivedHeaders["x-real-ip"]).toBeUndefined();
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
      }
    }
  );

  it("sanitizes request and response headers while preserving the streamed body", async () => {
    let receivedAuthorization: string | undefined;
    let receivedCookie: string | undefined;
    const server = createServer((request, response) => {
      receivedAuthorization = request.headers.authorization;
      receivedCookie = request.headers.cookie;
      response.writeHead(200, {
        "content-type": "text/plain",
        "set-cookie": "directus_refresh=secret; HttpOnly",
        "x-upstream": "safe"
      });
      response.end("proxied");
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("Test server did not expose a port");

      const proxyFetch = createSanitizedProxyFetch({
        accessToken: "server-token",
        source: "proxy"
      });
      const response = await proxyFetch(`http://127.0.0.1:${address.port}`, {
        headers: {
          authorization: "Bearer browser-token",
          cookie: "browser=secret",
          origin: "https://app.test"
        }
      });

      expect(receivedAuthorization).toBe("Bearer server-token");
      expect(receivedCookie).toBeUndefined();
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(response.headers.get("x-upstream")).toBe("safe");
      await expect(response.text()).resolves.toBe("proxied");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });
});

describe("Directus CSRF boundary", () => {
  const requestUrl = new URL("https://app.example.test/_directus/auth/login");

  it("rejects cross-origin and missing-origin mutations", () => {
    expect(() => assertDirectusSameOrigin(requestUrl, "POST")).toThrow(/CSRF/);
    expect(() =>
      assertDirectusSameOrigin(requestUrl, "POST", "https://attacker.example.test")
    ).toThrow(/CSRF/);
  });

  it("allows same-origin Origin and Referer metadata", () => {
    expect(() =>
      assertDirectusSameOrigin(requestUrl, "POST", "https://app.example.test")
    ).not.toThrow();
    expect(() =>
      assertDirectusSameOrigin(requestUrl, "POST", undefined, "https://app.example.test/login")
    ).not.toThrow();
  });

  it("does not require CSRF metadata for safe methods", () => {
    expect(() => assertDirectusSameOrigin(requestUrl, "GET")).not.toThrow();
  });
});

describe("Directus credential selection", () => {
  it("prefers a session token over a proxy token", () => {
    const credential = resolveDirectusCredential({
      sessionAccessToken: "session",
      proxyToken: "proxy"
    });

    expect(credential).toEqual({ accessToken: "session", source: "session" });
    expect(getDirectusAuthorizationHeader(credential)).toEqual({
      authorization: "Bearer session"
    });
  });

  it("gives a request-scoped preview token highest precedence", () => {
    expect(
      resolveDirectusCredential({
        previewAccessToken: "preview",
        sessionAccessToken: "session",
        proxyToken: "proxy"
      })
    ).toEqual({ accessToken: "preview", source: "preview" });
  });

  it("falls back to a proxy token and then unauthenticated requests", () => {
    expect(resolveDirectusCredential({ proxyToken: "proxy" })).toEqual({
      accessToken: "proxy",
      source: "proxy"
    });
    expect(resolveDirectusCredential({})).toEqual({ source: "none" });
    expect(getDirectusAuthorizationHeader({ source: "none" })).toEqual({});
  });
});
