import { createServer } from "node:http";
import { describe, expect, it } from "vitest";

import {
  createSanitizedProxyFetch,
  getForwardedProxyHeaders,
  requiresDirectusProxySameOrigin
} from "../src/runtime/server/handlers/proxy";
import { fetchDirectusAsset, resolveDirectusAssetUrl } from "../src/runtime/server/handlers/assets";
import { resolveDirectusProxyUrl } from "../src/runtime/server/utils/proxy";
import { assertDirectusSameOrigin } from "../src/runtime/server/utils/csrf";
import {
  getDirectusAuthorizationHeader,
  resolveDirectusCredential
} from "../src/runtime/server/utils/credentials";

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
      resolveDirectusAssetUrl(
        "https://cms.example.test/directus/",
        "/_directus/assets",
        new URL("https://app.example.test/_directus/assets/file-id?width=800&fit=cover")
      )
    ).toBe("https://cms.example.test/directus/assets/file-id?width=800&fit=cover");
    expect(() =>
      resolveDirectusAssetUrl(
        "https://cms.example.test",
        "/_directus/assets",
        new URL("https://app.example.test/_directus/assets/../admin")
      )
    ).toThrow(/Invalid Directus proxy path/);
  });
  it("requires same-origin metadata for every server-selected credential", () => {
    expect(requiresDirectusProxySameOrigin({ source: "none" })).toBe(false);
    expect(requiresDirectusProxySameOrigin({ source: "session", accessToken: "session" })).toBe(
      true
    );
    expect(requiresDirectusProxySameOrigin({ source: "static", accessToken: "static" })).toBe(true);
    expect(requiresDirectusProxySameOrigin({ source: "preview", accessToken: "preview" })).toBe(
      true
    );
  });

  it("joins the configured Directus base path and preserves queries", () => {
    expect(
      resolveDirectusProxyUrl(
        "https://cms.example.test/directus/",
        "/_directus/proxy",
        new URL("https://app.example.test/_directus/proxy/items/articles?limit=1")
      )
    ).toBe("https://cms.example.test/directus/items/articles?limit=1");
  });

  it("rejects malformed or traversing upstream paths", () => {
    expect(() =>
      resolveDirectusProxyUrl(
        "https://cms.example.test",
        "/_directus/proxy",
        new URL("https://app.example.test/_directus/proxy/%E0%A4%A")
      )
    ).toThrow(/Malformed/);

    expect(() =>
      resolveDirectusProxyUrl(
        "https://cms.example.test",
        "/_directus/proxy",
        new URL("https://app.example.test/_directus/proxy/../admin")
      )
    ).toThrow(/Invalid Directus proxy path/);

    expect(() =>
      resolveDirectusProxyUrl(
        "ftp://cms.example.test",
        "/_directus/proxy",
        new URL("https://app.example.test/_directus/proxy/items")
      )
    ).toThrow(/must use HTTP/);

    expect(() =>
      resolveDirectusProxyUrl(
        "not-a-url",
        "/_directus/proxy",
        new URL("https://app.example.test/_directus/proxy/items")
      )
    ).toThrow(/must use HTTP/);
  });

  it("filters all credential and origin headers before forwarding", () => {
    expect(getForwardedProxyHeaders()).toEqual(
      expect.arrayContaining([
        "authorization",
        "cookie",
        "content-length",
        "host",
        "origin",
        "connection",
        "transfer-encoding"
      ])
    );
  });

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
        source: "static"
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
  it("prefers a session token over a static token", () => {
    const credential = resolveDirectusCredential({
      sessionAccessToken: "session",
      staticToken: "static"
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
        staticToken: "static"
      })
    ).toEqual({ accessToken: "preview", source: "preview" });
  });

  it("falls back to static and then unauthenticated requests", () => {
    expect(resolveDirectusCredential({ staticToken: "static" })).toEqual({
      accessToken: "static",
      source: "static"
    });
    expect(resolveDirectusCredential({})).toEqual({ source: "none" });
    expect(getDirectusAuthorizationHeader({ source: "none" })).toEqual({});
  });
});
