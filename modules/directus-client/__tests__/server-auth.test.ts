import { describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const readDirectusSessionSnapshot = vi.fn();

vi.mock("../src/runtime/server/utils/auth", () => ({ readDirectusSessionSnapshot }));

const { useDirectusServerAuth } = await import("../src/runtime/server/composables/directus-auth");

describe("useDirectusServerAuth", () => {
  it("reads the token-free session snapshot for the request", async () => {
    const event = createTestEvent();
    const snapshot = {
      userId: "user-1",
      email: "user@example.test",
      firstName: "User",
      lastName: "One",
      requiresTfaSetup: false
    };
    readDirectusSessionSnapshot.mockResolvedValue(snapshot);

    await expect(useDirectusServerAuth(event)).resolves.toEqual(snapshot);
    expect(readDirectusSessionSnapshot).toHaveBeenCalledWith(event);
  });

  it("returns null for an unauthenticated request", async () => {
    readDirectusSessionSnapshot.mockResolvedValue(null);

    await expect(useDirectusServerAuth(createTestEvent())).resolves.toBeNull();
  });
});
