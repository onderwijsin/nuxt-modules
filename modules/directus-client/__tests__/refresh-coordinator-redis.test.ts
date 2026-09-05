import { describe, expect, it, vi } from "vitest";
import { createRedisCoordinator } from "../src/runtime/auth/server/refresh-coordinator/redis";
import { FakeRedis } from "./fixtures/fake-redis";

function createCoordinator(redis: FakeRedis) {
  return createRedisCoordinator({
    options: { base: "configured" },
    getInstance: () => redis
  });
}

function leaseKey(refreshKey: string): string {
  return `configured:directus-auth-refresh:{${refreshKey}}:lease`;
}

function resultKey(refreshKey: string): string {
  return `configured:directus-auth-refresh:{${refreshKey}}:result`;
}

describe("Directus Redis refresh coordination", () => {
  it("executes one owner, publishes with a five-second TTL, and releases safely", async () => {
    const redis = new FakeRedis();
    const coordinator = createCoordinator(redis);
    const operation = vi.fn(async () => ({
      flight: { status: "completed" as const, sealedSession: "boop1:sealed" },
      value: "owner-session"
    }));

    await expect(coordinator.coordinate("basic", operation)).resolves.toEqual({
      source: "owner",
      flight: { status: "completed", sealedSession: "boop1:sealed" },
      value: "owner-session"
    });
    expect(operation).toHaveBeenCalledOnce();
    expect(redis.setCalls[1]).toMatchObject({ key: resultKey("basic"), arguments_: ["EX", 5] });
    expect(redis.has(leaseKey("basic"))).toBe(false);
    expect(redis.records.get(resultKey("basic"))?.expiresAt).toBeGreaterThan(Date.now() + 4_900);
    expect(redis.records.get(resultKey("basic"))?.expiresAt).toBeLessThanOrEqual(
      Date.now() + 5_000
    );
  });

  it("reuses an existing result without executing the operation", async () => {
    const redis = new FakeRedis();
    const coordinator = createCoordinator(redis);
    await redis.set(
      resultKey("existing"),
      JSON.stringify({ status: "failed", outcome: "terminal" }),
      "EX",
      5
    );
    const operation = vi.fn(async () => ({
      flight: { status: "completed" as const, sealedSession: "unused" }
    }));

    await expect(coordinator.coordinate("existing", operation)).resolves.toEqual({
      source: "shared",
      flight: { status: "failed", outcome: "terminal" }
    });
    expect(operation).not.toHaveBeenCalled();
  });

  it("allows only one of two independent coordinators to execute", async () => {
    const redis = new FakeRedis();
    const firstCoordinator = createCoordinator(redis);
    const secondCoordinator = createCoordinator(redis);
    let resolveOwner!: (result: { status: "completed"; sealedSession: string }) => void;
    const ownerOperation = vi.fn(
      () =>
        new Promise<{ flight: { status: "completed"; sealedSession: string } }>((resolve) => {
          resolveOwner = (flight) => resolve({ flight });
        })
    );
    const followerOperation = vi.fn(async () => ({
      flight: { status: "completed" as const, sealedSession: "wrong" }
    }));

    const owner = firstCoordinator.coordinate("race", ownerOperation);
    await vi.waitFor(() => expect(ownerOperation).toHaveBeenCalledOnce());
    const follower = secondCoordinator.coordinate("race", followerOperation);
    await vi.waitFor(() => expect(followerOperation).not.toHaveBeenCalled());
    resolveOwner({ status: "completed", sealedSession: "boop1:shared" });

    await expect(owner).resolves.toMatchObject({ source: "owner" });
    await expect(follower).resolves.toEqual({
      source: "shared",
      flight: { status: "completed", sealedSession: "boop1:shared" }
    });
    expect(followerOperation).not.toHaveBeenCalled();
  });

  it("checks the result again after winning a lease", async () => {
    const redis = new FakeRedis();
    const coordinator = createCoordinator(redis);
    redis.beforeLeaseSet = () => {
      void redis.set(
        resultKey("acquire-race"),
        JSON.stringify({ status: "completed", sealedSession: "boop1:already-rotated" }),
        "EX",
        5
      );
      redis.beforeLeaseSet = undefined;
    };
    const operation = vi.fn(async () => ({
      flight: { status: "completed" as const, sealedSession: "wrong" }
    }));

    await expect(coordinator.coordinate("acquire-race", operation)).resolves.toEqual({
      source: "shared",
      flight: { status: "completed", sealedSession: "boop1:already-rotated" }
    });
    expect(operation).not.toHaveBeenCalled();
  });

  it("waits for a legitimate slow active owner", async () => {
    vi.useFakeTimers();
    try {
      const redis = new FakeRedis();
      const firstCoordinator = createCoordinator(redis);
      const secondCoordinator = createCoordinator(redis);
      const ownerOperation = vi.fn(
        () =>
          new Promise<{ flight: { status: "completed"; sealedSession: string } }>((resolve) => {
            setTimeout(
              () => resolve({ flight: { status: "completed", sealedSession: "boop1:slow" } }),
              4_000
            );
          })
      );
      const owner = firstCoordinator.coordinate("slow", ownerOperation);
      await vi.waitFor(() => expect(ownerOperation).toHaveBeenCalledOnce());
      const follower = secondCoordinator.coordinate("slow", async () => ({
        flight: { status: "completed" as const, sealedSession: "wrong" }
      }));

      await vi.advanceTimersByTimeAsync(4_000);
      await expect(follower).resolves.toMatchObject({
        source: "shared",
        flight: { sealedSession: "boop1:slow" }
      });
      await expect(owner).resolves.toMatchObject({ source: "owner" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries ownership when an active lease disappears without a result", async () => {
    vi.useFakeTimers();
    try {
      const redis = new FakeRedis();
      const coordinator = createCoordinator(redis);
      await redis.set(leaseKey("orphaned"), "dead-owner", "EX", 30);
      const operation = vi.fn(async () => ({
        flight: { status: "completed" as const, sealedSession: "boop1:recovered" }
      }));
      const follower = coordinator.coordinate("orphaned", operation);
      setTimeout(() => redis.delete(leaseKey("orphaned")), 100);
      await vi.advanceTimersByTimeAsync(100);
      await expect(follower).resolves.toMatchObject({
        source: "owner",
        flight: { sealedSession: "boop1:recovered" }
      });
      expect(operation).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not delete a lease that another owner acquired", async () => {
    const redis = new FakeRedis();
    const coordinator = createCoordinator(redis);
    redis.beforeEval = () => {
      void redis.set(leaseKey("ownership"), "new-owner", "EX", 30);
    };

    await coordinator.coordinate("ownership", async () => ({
      flight: { status: "completed" as const, sealedSession: "boop1:owned" }
    }));
    expect(await redis.get(leaseKey("ownership"))).toBe("new-owner");
    expect(redis.evalCalls[0]?.script).toContain('redis.call("get", KEYS[1]) == ARGV[1]');
    expect(redis.evalCalls[0]?.script).toContain('redis.call("del", KEYS[1])');
  });

  it("retains the lease when result publication fails", async () => {
    vi.useFakeTimers();
    try {
      const redis = new FakeRedis();
      const owner = createCoordinator(redis);
      const follower = createCoordinator(redis);
      redis.failNextResultPublication = true;

      await expect(
        owner.coordinate("publication-failure", async () => ({
          flight: { status: "completed" as const, sealedSession: "boop1:local" },
          value: "local-session"
        }))
      ).resolves.toMatchObject({ source: "owner", value: "local-session" });
      expect(await redis.get(leaseKey("publication-failure"))).toEqual(expect.any(String));

      const staleFollower = follower.coordinate("publication-failure", async () => ({
        flight: { status: "completed" as const, sealedSession: "wrong" }
      }));
      const staleOutcome = staleFollower.catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(12_000);
      await expect(staleOutcome).resolves.toMatchObject({
        message: "Directus refresh coordination timed out"
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses a one-second transient result window", async () => {
    vi.useFakeTimers();
    try {
      const redis = new FakeRedis();
      const coordinator = createCoordinator(redis);
      const operation = vi
        .fn()
        .mockResolvedValueOnce({
          flight: { status: "failed" as const, outcome: "transient" as const }
        })
        .mockResolvedValueOnce({
          flight: { status: "completed" as const, sealedSession: "boop1:recovered" }
        });

      await coordinator.coordinate("transient", operation);
      await expect(coordinator.coordinate("transient", operation)).resolves.toMatchObject({
        source: "shared",
        flight: { outcome: "transient" }
      });
      vi.advanceTimersByTime(1_001);
      await expect(coordinator.coordinate("transient", operation)).resolves.toMatchObject({
        source: "owner",
        flight: { sealedSession: "boop1:recovered" }
      });
      expect(operation).toHaveBeenCalledTimes(2);
      expect(
        redis.setCalls.find((call) => call.key === resultKey("transient"))?.arguments_
      ).toEqual(["EX", 1]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses a five-second result window for terminal failures", async () => {
    const redis = new FakeRedis();
    const coordinator = createCoordinator(redis);
    const operation = vi.fn(async () => ({
      flight: { status: "failed" as const, outcome: "terminal" as const }
    }));

    await coordinator.coordinate("terminal", operation);
    await expect(coordinator.coordinate("terminal", operation)).resolves.toMatchObject({
      source: "shared",
      flight: { outcome: "terminal" }
    });
    expect(redis.setCalls.find((call) => call.key === resultKey("terminal"))?.arguments_).toEqual([
      "EX",
      5
    ]);
    expect(operation).toHaveBeenCalledOnce();
  });

  it("expires completed results after five seconds", async () => {
    vi.useFakeTimers();
    try {
      const redis = new FakeRedis();
      const coordinator = createCoordinator(redis);
      const operation = vi
        .fn()
        .mockResolvedValueOnce({
          flight: { status: "completed" as const, sealedSession: "boop1:first" }
        })
        .mockResolvedValueOnce({
          flight: { status: "completed" as const, sealedSession: "boop1:second" }
        });

      await coordinator.coordinate("completed", operation);
      vi.advanceTimersByTime(5_001);
      await expect(coordinator.coordinate("completed", operation)).resolves.toMatchObject({
        source: "owner",
        flight: { sealedSession: "boop1:second" }
      });
      expect(operation).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
