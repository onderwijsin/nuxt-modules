import { describe, expect, it, vi } from "vitest";

import {
  createMemoryCoordinator,
  pruneExpiredFlights
} from "../src/runtime/auth/server/refresh-coordinator/memory";
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

  it("prunes expired settled flights when coordination starts", async () => {
    vi.useFakeTimers();
    try {
      const flights = new Map([
        [
          "transient",
          { expiresAt: 999, settled: true, flight: { status: "failed", outcome: "transient" } }
        ],
        [
          "completed",
          {
            expiresAt: 999,
            settled: true,
            flight: { status: "completed", sealedSession: "sealed" }
          }
        ],
        ["active", { expiresAt: 999, settled: false }]
      ]);

      pruneExpiredFlights(flights, 1_000);

      expect(flights.has("transient")).toBe(false);
      expect(flights.has("completed")).toBe(false);
      expect(flights.has("active")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cleans expired flights for other keys without interrupting an active owner", async () => {
    vi.useFakeTimers();
    try {
      const coordinator = createMemoryCoordinator();
      let resolveOwner!: (result: RefreshOwnerResult<string>) => void;
      const activeOwner = coordinator.coordinate(
        "active",
        () =>
          new Promise<RefreshOwnerResult<string>>((resolve) => {
            resolveOwner = resolve;
          })
      );
      const transientOperation = vi.fn(async (): Promise<RefreshOwnerResult<string>> => ({
        flight: { status: "failed", outcome: "transient" }
      }));
      await coordinator.coordinate("expired", transientOperation);

      vi.advanceTimersByTime(30_001);
      const cleanupOperation = vi.fn(async (): Promise<RefreshOwnerResult<string>> => ({
        flight: { status: "completed", sealedSession: "boop1:cleanup" },
        value: "cleanup"
      }));
      await coordinator.coordinate("cleanup", cleanupOperation);

      const secondActive = coordinator.coordinate(
        "active",
        vi.fn(async (): Promise<RefreshOwnerResult<string>> => ({
          flight: { status: "completed", sealedSession: "boop1:wrong" },
          value: "wrong"
        }))
      );
      resolveOwner({
        flight: { status: "completed", sealedSession: "boop1:active" },
        value: "active"
      });

      await expect(activeOwner).resolves.toMatchObject({ source: "owner", value: "active" });
      await expect(secondActive).resolves.toEqual({
        source: "shared",
        flight: { status: "completed", sealedSession: "boop1:active" }
      });
      expect(transientOperation).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});
