import { describe, expect, it, vi } from "vitest";

import { createMemoryCoordinator } from "../src/runtime/auth/server/refresh-coordinator/memory";
import type { RefreshOwnerResult } from "../src/runtime/auth/server/refresh-coordinator/shared";

describe("Directus memory refresh coordination", () => {
  it("shares only the reusable flight with followers", async () => {
    const coordinator = createMemoryCoordinator();
    let resolveOwner!: (result: RefreshOwnerResult<string>) => void;
    const ownerOperation = vi.fn(
      () =>
        new Promise<RefreshOwnerResult<string>>((resolve) => {
          resolveOwner = resolve;
        })
    );
    const followerOperation = vi.fn(async (): Promise<RefreshOwnerResult<string>> => ({
      flight: { status: "completed", sealedSession: "wrong" },
      value: "should-not-be-used"
    }));
    const owner = coordinator.coordinate("memory-shared", ownerOperation);
    const follower = coordinator.coordinate("memory-shared", followerOperation);
    resolveOwner({
      flight: { status: "completed", sealedSession: "boop1:shared" },
      value: "owner-only"
    });

    await expect(owner).resolves.toMatchObject({
      source: "owner",
      value: "owner-only"
    });
    await expect(follower).resolves.toEqual({
      source: "shared",
      flight: { status: "completed", sealedSession: "boop1:shared" }
    });
    expect(ownerOperation).toHaveBeenCalledOnce();
    expect(followerOperation).not.toHaveBeenCalled();
  });

  it("does not share an owner's original failure", async () => {
    const coordinator = createMemoryCoordinator();
    const ownerError = new Error("owner-only");
    const ownerOperation = vi.fn(async (): Promise<RefreshOwnerResult<string>> => ({
      flight: { status: "failed", outcome: "transient" },
      error: ownerError
    }));
    const followerOperation = vi.fn(async (): Promise<RefreshOwnerResult<string>> => ({
      flight: { status: "completed", sealedSession: "wrong" },
      value: "should-not-be-used"
    }));

    const owner = coordinator.coordinate("memory-failure", ownerOperation);
    const follower = coordinator.coordinate("memory-failure", followerOperation);

    await expect(owner).resolves.toEqual({
      source: "owner",
      flight: { status: "failed", outcome: "transient" },
      error: ownerError
    });
    await expect(follower).resolves.toEqual({
      source: "shared",
      flight: { status: "failed", outcome: "transient" }
    });
    expect(followerOperation).not.toHaveBeenCalled();
  });

  it("expires transient results after one second and completed results after five seconds", async () => {
    vi.useFakeTimers();
    try {
      const coordinator = createMemoryCoordinator();
      const operation = vi
        .fn<() => Promise<RefreshOwnerResult<string>>>()
        .mockResolvedValueOnce({
          flight: { status: "failed" as const, outcome: "transient" as const }
        })
        .mockResolvedValueOnce({
          flight: { status: "completed" as const, sealedSession: "boop1:completed" },
          value: "completed"
        })
        .mockResolvedValueOnce({
          flight: { status: "completed" as const, sealedSession: "boop1:after-expiry" },
          value: "after-expiry"
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
