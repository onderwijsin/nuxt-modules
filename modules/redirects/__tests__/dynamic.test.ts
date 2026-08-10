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
});
