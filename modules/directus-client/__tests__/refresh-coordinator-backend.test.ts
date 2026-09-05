import { describe, expect, it, vi } from "vitest";

const getMount = vi.fn(() => ({ driver: { name: "filesystem" } }));
vi.mock("nitropack/runtime", () => ({ useStorage: () => ({ getMount }) }));

const { getRefreshCoordinator } = await import("../src/runtime/auth/server/refresh-coordinator");

describe("Directus refresh coordinator backend resolution", () => {
  it("rejects unsupported storage drivers instead of falling back to memory", async () => {
    await expect(getRefreshCoordinator()).rejects.toThrow(
      "Unsupported Directus refresh storage driver: filesystem"
    );
    expect(getMount).toHaveBeenCalledWith("directus-auth-refresh");
  });
});
