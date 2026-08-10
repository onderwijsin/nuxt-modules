import { describe, expect, it } from "vitest";

import {
  getForwardedProxyHeaders,
  resolveDirectusProxyUrl
} from "../src/runtime/server/handlers/proxy";
import {
  getDirectusAuthorizationHeader,
  resolveDirectusCredential
} from "../src/runtime/server/utils/credentials";

describe("Directus proxy boundary", () => {
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
  });

  it("filters all credential and origin headers before forwarding", () => {
    expect(getForwardedProxyHeaders()).toEqual(
      expect.arrayContaining(["authorization", "cookie", "host", "origin"])
    );
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

  it("falls back to static and then unauthenticated requests", () => {
    expect(resolveDirectusCredential({ staticToken: "static" })).toEqual({
      accessToken: "static",
      source: "static"
    });
    expect(resolveDirectusCredential({})).toEqual({ source: "none" });
    expect(getDirectusAuthorizationHeader({ source: "none" })).toEqual({});
  });
});
