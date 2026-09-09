import { describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const { useDirectusServerAuth } =
  await import("../src/runtime/auth/server/use-directus-server-auth");

describe("useDirectusServerAuth", () => {
  it("uses the refresh-aware resolver for the request", async () => {
    const event = createTestEvent();
    const resolve = vi.fn();
    event.context.directusAuth = { resolve, resolveSnapshot: vi.fn() };
    const sessionSnapshot = {
      userId: "user-1",
      requiresTfaSetup: false
    };
    resolve.mockResolvedValue({ accessToken: "access-token", snapshot: sessionSnapshot });

    await expect(useDirectusServerAuth(event)).resolves.toEqual(sessionSnapshot);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it("returns null for an unauthenticated request", async () => {
    const event = createTestEvent();
    const resolve = vi.fn().mockResolvedValue({ accessToken: undefined, snapshot: null });
    event.context.directusAuth = { resolve, resolveSnapshot: vi.fn() };

    await expect(useDirectusServerAuth(event)).resolves.toBeNull();
  });

  it("propagates transient refresh failures", async () => {
    const error = new Error("refresh unavailable");
    const resolve = vi.fn().mockRejectedValue(error);
    const event = createTestEvent();
    event.context.directusAuth = { resolve, resolveSnapshot: vi.fn() };

    await expect(useDirectusServerAuth(event)).rejects.toBe(error);

    expect(resolve).toHaveBeenCalledTimes(1);
  });
});
