import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../../test-utils/src";
import { assertAdminAccess, isDevelopmentAuthBypassEnabled } from "../../src/server";

describe("administrator authentication", () => {
  it("requires a valid token outside development bypass mode", () => {
    expect(() =>
      assertAdminAccess(
        createTestEvent(),
        { adminToken: "token", adminHeaderName: "x-admin-token", devAuthBypass: false },
        false
      )
    ).toThrowError("Unauthorized");
  });

  it("allows the configured token and development bypass", () => {
    const event = createTestEvent();
    event.node.req.headers["x-admin-token"] = "token";

    expect(() =>
      assertAdminAccess(
        event,
        { adminToken: "token", adminHeaderName: "x-admin-token", devAuthBypass: false },
        false
      )
    ).not.toThrow();
    expect(() =>
      assertAdminAccess(
        createTestEvent(),
        { adminToken: undefined, adminHeaderName: "x-admin-token", devAuthBypass: true },
        true
      )
    ).not.toThrow();
  });

  it.each([
    [true, false, false],
    [false, true, false],
    [true, true, true]
  ])("only enables the bypass in development", (isDevelopment, enabled, expected) => {
    expect(isDevelopmentAuthBypassEnabled(isDevelopment, enabled)).toBe(expected);
  });
});
