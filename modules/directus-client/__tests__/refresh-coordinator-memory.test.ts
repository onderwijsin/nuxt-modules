import { describe, expect, it, vi } from "vitest";

import { createMemoryCoordinator } from "../src/runtime/auth/server/refresh-coordinator/memory";

describe("Directus memory refresh coordination", () => {
  it("shares only the reusable flight with followers", async () => {
    const coordinator = createMemoryCoordinator();
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
    const owner = coordinator.coordinate("memory-shared", ownerOperation);
    const follower = coordinator.coordinate("memory-shared", async () => ({
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
      const coordinator = createMemoryCoordinator();
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
