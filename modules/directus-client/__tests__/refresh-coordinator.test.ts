import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  client: {
    get: vi.fn(),
    set: vi.fn(),
    eval: vi.fn()
  },
  rootStorage: {
    getMount: vi.fn()
  }
}));

vi.mock("nitropack/runtime", () => ({ useStorage: () => state.rootStorage }));

const { getRefreshCoordinator, refreshCoordinatorConfig } =
  await import("../src/runtime/auth/server/refresh-coordinator");

beforeEach(() => {
  state.client.get.mockResolvedValue(null);
  state.client.set.mockResolvedValue("OK");
  state.client.eval.mockResolvedValue(1);
  state.rootStorage.getMount.mockReturnValue({
    driver: {
      name: "redis",
      options: { base: "configured" },
      getInstance: vi.fn(() => state.client)
    }
  });
});

describe("Directus refresh coordinator Redis backend", () => {
  it("uses the configured Redis client and explicit seconds-based leases", async () => {
    const coordinator = await getRefreshCoordinator();
    const result = await coordinator.coordinate("refresh-hash", async () => ({
      flight: { status: "completed", sealedSession: "boop1:sealed" }
    }));

    expect(result.flight).toEqual({ status: "completed", sealedSession: "boop1:sealed" });
    expect(state.rootStorage.getMount).toHaveBeenCalledWith("directus-auth-refresh");
    expect(state.client.set).toHaveBeenNthCalledWith(
      1,
      "configured:directus-auth-refresh:{refresh-hash}:lease",
      expect.any(String),
      "NX",
      "EX",
      refreshCoordinatorConfig.leaseSeconds
    );
    expect(state.client.set).toHaveBeenNthCalledWith(
      2,
      "configured:directus-auth-refresh:{refresh-hash}:result",
      JSON.stringify({ status: "completed", sealedSession: "boop1:sealed" }),
      "EX",
      refreshCoordinatorConfig.resultSeconds
    );
    expect(state.client.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("del", KEYS[1])'),
      1,
      "configured:directus-auth-refresh:{refresh-hash}:lease",
      expect.any(String)
    );
  });

  it("reuses a published result without executing a new flight", async () => {
    state.client.get.mockResolvedValueOnce(
      JSON.stringify({ status: "failed", outcome: "transient" })
    );
    const coordinator = await getRefreshCoordinator();
    const operation = vi.fn(async () => ({
      flight: { status: "completed" as const, sealedSession: "unused" }
    }));

    await expect(coordinator.coordinate("published", operation)).resolves.toEqual({
      flight: { status: "failed", outcome: "transient" }
    });
    expect(operation).not.toHaveBeenCalled();
  });
});
