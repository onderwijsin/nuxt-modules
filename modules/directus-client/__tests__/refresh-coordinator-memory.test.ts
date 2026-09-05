import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rootStorage: { getMount: vi.fn() } }));
vi.mock("nitropack/runtime", () => ({ useStorage: () => state.rootStorage }));

async function loadCoordinator() {
  vi.resetModules();
  return import("../src/runtime/auth/server/refresh-coordinator");
}

beforeEach(() => {
  state.rootStorage.getMount.mockReset();
  state.rootStorage.getMount.mockReturnValue({ driver: { name: "memory" } });
});

describe("Directus memory refresh coordination", () => {
  it("shares only the reusable flight with followers", async () => {
    const { getRefreshCoordinator } = await loadCoordinator();
    let resolveOwner!: (result: { status: "completed"; sealedSession: string }) => void;
    const ownerOperation = vi.fn(
      () =>
        new Promise<{
          flight: { status: "completed"; sealedSession: string };
          value: string;
          error: Error;
        }>((resolve) => {
          resolveOwner = (flight) =>
            resolve({ flight, value: "owner-only", error: new Error("owner-only") });
        })
    );
    const owner = getRefreshCoordinator().coordinate("memory-shared", ownerOperation);
    const follower = getRefreshCoordinator().coordinate("memory-shared", async () => ({
      flight: { status: "completed" as const, sealedSession: "wrong" }
    }));
    resolveOwner({ status: "completed", sealedSession: "boop1:shared" });

    await expect(owner).resolves.toMatchObject({
      source: "owner",
      value: "owner-only",
      error: expect.any(Error)
    });
    await expect(follower).resolves.toEqual({
      source: "shared",
      flight: { status: "completed", sealedSession: "boop1:shared" }
    });
    expect(ownerOperation).toHaveBeenCalledOnce();
  });

  it("expires transient results after one second and completed results after five seconds", async () => {
    vi.useFakeTimers();
    try {
      const { getRefreshCoordinator } = await loadCoordinator();
      const coordinator = getRefreshCoordinator();
      const operation = vi
        .fn()
        .mockResolvedValueOnce({
          flight: { status: "failed" as const, outcome: "transient" as const }
        })
        .mockResolvedValueOnce({
          flight: { status: "completed" as const, sealedSession: "boop1:completed" }
        })
        .mockResolvedValueOnce({
          flight: { status: "completed" as const, sealedSession: "boop1:after-expiry" }
        });

      await coordinator.coordinate("memory-ttl", operation);
      vi.advanceTimersByTime(1_001);
      await coordinator.coordinate("memory-ttl", operation);
      await expect(coordinator.coordinate("memory-ttl", operation)).resolves.toMatchObject({
        source: "shared",
        flight: { sealedSession: "boop1:completed" }
      });
      vi.advanceTimersByTime(5_001);
      await expect(coordinator.coordinate("memory-ttl", operation)).resolves.toMatchObject({
        source: "owner",
        flight: { sealedSession: "boop1:after-expiry" }
      });
      expect(operation).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
