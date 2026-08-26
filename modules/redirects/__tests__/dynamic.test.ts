import { describe, expect, it } from "vitest";

import { compileDynamicRedirects, findCompiledDynamicRedirect } from "../src/runtime/utils/dynamic";

describe("dynamic redirect matching", () => {
  const compiled = compileDynamicRedirects([
    {
      from: "/legacy/:section/:slug",
      to: "/docs/:section/:slug",
      statusCode: 301,
      match: "pattern"
    },
    {
      from: "/files/*",
      to: "/downloads/*",
      statusCode: 302,
      match: "pattern"
    },
    {
      from: "/guides/:version?/intro",
      to: "/documentation/:version?/intro",
      statusCode: 307,
      match: "pattern"
    },
    {
      from: "/files/*?/download",
      to: "/downloads/*?/download",
      statusCode: 308,
      match: "pattern"
    }
  ]);

  it("resolves named parameters and escapes captured path values", () => {
    expect(findCompiledDynamicRedirect(compiled, "/legacy/guides/getting-started")).toEqual({
      from: "/legacy/:section/:slug",
      to: "/docs/guides/getting-started",
      statusCode: 301,
      match: "pattern"
    });
    expect(findCompiledDynamicRedirect(compiled, "/legacy/guides/a%2Fb")).toMatchObject({
      to: "/docs/guides/a%2Fb"
    });
  });

  it("supports wildcards and returns the first matching rule", () => {
    expect(findCompiledDynamicRedirect(compiled, "/files/a/b.txt")).toMatchObject({
      to: "/downloads/a/b.txt",
      statusCode: 302
    });
    expect(findCompiledDynamicRedirect(compiled, "/unknown")).toBeNull();
  });

  it("skips inactive rules and continues matching", () => {
    const rules = compileDynamicRedirects([
      {
        from: "/scheduled/:slug",
        to: "/future/:slug",
        statusCode: 301,
        match: "pattern",
        activeFrom: Date.parse("2999-01-01T00:00:00.000Z")
      },
      {
        from: "/scheduled/:slug",
        to: "/current/:slug",
        statusCode: 302,
        match: "pattern"
      }
    ]);

    expect(findCompiledDynamicRedirect(rules, "/scheduled/page")).toMatchObject({
      to: "/current/page"
    });
  });

  it("matches optional named and wildcard segments", () => {
    expect(findCompiledDynamicRedirect(compiled, "/guides/v2/intro")).toMatchObject({
      to: "/documentation/v2/intro",
      statusCode: 307
    });
    expect(findCompiledDynamicRedirect(compiled, "/guides/intro")).toMatchObject({
      to: "/documentation/intro",
      statusCode: 307
    });
    expect(findCompiledDynamicRedirect(compiled.slice(3), "/files/download")).toMatchObject({
      to: "/downloads/download",
      statusCode: 308
    });
  });
});
