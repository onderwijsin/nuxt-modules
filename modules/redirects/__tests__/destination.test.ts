import { describe, expect, it } from "vitest";

import {
  isExternalRedirectDestination,
  toRedirectDestination
} from "../src/runtime/utils/destination";

describe("redirect destinations", () => {
  it("recognizes explicit and protocol-less external domains", () => {
    expect(isExternalRedirectDestination("https://example.com/path")).toBe(true);
    expect(isExternalRedirectDestination("//example.com/path")).toBe(true);
    expect(isExternalRedirectDestination("sub.example.com/path?source=cms")).toBe(true);
  });

  it("keeps internal paths internal and makes bare domains browser-safe", () => {
    expect(isExternalRedirectDestination("/new-path")).toBe(false);
    expect(isExternalRedirectDestination("new-path")).toBe(false);
    expect(toRedirectDestination("sub.example.com/path?source=cms")).toBe(
      "https://sub.example.com/path?source=cms"
    );
    expect(toRedirectDestination("/new-path?source=cms")).toBe("/new-path?source=cms");
  });
});
