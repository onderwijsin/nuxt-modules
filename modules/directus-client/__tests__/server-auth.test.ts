import { describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const snapshot = vi.fn();

const { useDirectusServerAuth } =
  await import("../src/runtime/auth/server/use-directus-server-auth");

describe("useDirectusServerAuth", () => {
  it("reads the token-free session snapshot for the request", async () => {
    const event = createTestEvent();
    event.context.directusAuth = { resolve: vi.fn(), snapshot };
    const sessionSnapshot = {
      userId: "user-1",
      email: "user@example.test",
      firstName: "User",
      lastName: "One",
      requiresTfaSetup: false
    };
    snapshot.mockResolvedValue(sessionSnapshot);

    await expect(useDirectusServerAuth(event)).resolves.toEqual(sessionSnapshot);
    expect(snapshot).toHaveBeenCalledTimes(1);
  });

  it("returns null for an unauthenticated request", async () => {
    const event = createTestEvent();
    event.context.directusAuth = { resolve: vi.fn(), snapshot };
    snapshot.mockResolvedValue(null);

    await expect(useDirectusServerAuth(event)).resolves.toBeNull();
  });

  it("does not use the refresh-aware resolver", async () => {
    const resolve = vi.fn();
    const event = createTestEvent();
    event.context.directusAuth = { resolve, snapshot: vi.fn().mockResolvedValue(null) };

    await useDirectusServerAuth(event);

    expect(resolve).not.toHaveBeenCalled();
  });
});
