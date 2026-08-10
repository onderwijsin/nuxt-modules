import { describe, expect, it } from "vitest";

import {
  createRedirectExclusionMatcher,
  isRedirectExcluded
} from "../src/runtime/utils/exclusions";

describe("redirect exclusions", () => {
  it("uses constant-time exact route checks and namespace prefixes", () => {
    const matcher = createRedirectExclusionMatcher({
      excludedNamespaces: ["/api", "/_nuxt", "/api"],
      excludedRoutes: ["/", "/health", "/health"]
    });

    expect(matcher.namespaces).toEqual(new Set(["/api", "/_nuxt"]));
    expect(matcher.routes).toEqual(new Set(["/", "/health"]));
    expect(isRedirectExcluded("/api/redirects", matcher)).toBe(true);
    expect(isRedirectExcluded("/_nuxt/app.js", matcher)).toBe(true);
    expect(isRedirectExcluded("/health", matcher)).toBe(true);
    expect(isRedirectExcluded("/content", matcher)).toBe(false);
  });
});
