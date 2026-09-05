import { describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const resolve = vi.fn();

const { useDirectusServerAuth } =
  await import("../src/runtime/auth/server/composables/directus-auth");

describe("useDirectusServerAuth", () => {
  it("reads the token-free session snapshot for the request", async () => {
    const event = createTestEvent();
    event.context.directusAuth = { resolve };
    const snapshot = {
      userId: "user-1",
      email: "user@example.test",
      firstName: "User",
      lastName: "One",
      requiresTfaSetup: false
    };
    resolve.mockResolvedValue({ accessToken: "access-token", snapshot });

    await expect(useDirectusServerAuth(event)).resolves.toEqual(snapshot);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it("returns null for an unauthenticated request", async () => {
    const event = createTestEvent();
    event.context.directusAuth = { resolve };
    resolve.mockResolvedValue({ snapshot: null });

    await expect(useDirectusServerAuth(event)).resolves.toBeNull();
  });
});
