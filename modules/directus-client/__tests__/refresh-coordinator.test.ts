import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeRecord {
  value: string;
  expiresAt?: number;
}

class FakeRedis {
  readonly records = new Map<string, FakeRecord>();
  readonly setCalls: Array<{ key: string; value: string; arguments_: Array<string | number> }> = [];
  beforeGet?: (key: string) => void;
  beforeEval?: () => void;
  failNextResultPublication = false;

  private expire(key: string): FakeRecord | undefined {
    const record = this.records.get(key);
    if (record?.expiresAt !== undefined && record.expiresAt <= Date.now()) {
      this.records.delete(key);
      return undefined;
    }
    return record;
  }

  async get(key: string): Promise<string | null> {
    this.beforeGet?.(key);
    this.beforeGet = undefined;
    return this.expire(key)?.value ?? null;
  }

  async set(key: string, value: string, ...arguments_: Array<string | number>): Promise<unknown> {
    this.setCalls.push({ key, value, arguments_ });
    if (this.failNextResultPublication && arguments_[0] === "EX") {
      this.failNextResultPublication = false;
      throw new Error("Redis publication unavailable");
    }
    if (arguments_.includes("NX") && this.expire(key)) return null;
    const expiryIndex = arguments_.indexOf("EX");
    const ttl = expiryIndex >= 0 ? Number(arguments_[expiryIndex + 1]) : undefined;
    this.records.set(key, {
      value,
      ...(ttl !== undefined ? { expiresAt: Date.now() + ttl * 1_000 } : {})
    });
    return "OK";
  }

  async eval(_script: string, _keyCount: number, key: string, owner: string): Promise<number> {
    this.beforeEval?.();
    this.beforeEval = undefined;
    const record = this.expire(key);
    if (record?.value !== owner) return 0;
    this.records.delete(key);
    return 1;
  }

  delete(key: string): void {
    this.records.delete(key);
  }

  has(key: string): boolean {
    return this.expire(key) !== undefined;
  }
}

const state = vi.hoisted(() => ({
  rootStorage: { getMount: vi.fn() }
}));

vi.mock("nitropack/runtime", () => ({ useStorage: () => state.rootStorage }));

async function loadCoordinator() {
  vi.resetModules();
  return import("../src/runtime/auth/server/refresh-coordinator");
}

function configureRedis(redis: FakeRedis): void {
  state.rootStorage.getMount.mockReturnValue({
    driver: {
      name: "redis",
      options: { base: "configured" },
      getInstance: () => redis
    }
  });
}

function leaseKey(refreshKey: string): string {
  return `configured:directus-auth-refresh:{${refreshKey}}:lease`;
}

function resultKey(refreshKey: string): string {
  return `configured:directus-auth-refresh:{${refreshKey}}:result`;
}

beforeEach(() => state.rootStorage.getMount.mockReset());

describe("Directus Redis refresh coordination", () => {
  it("executes one owner, publishes with a five-second TTL, and releases safely", async () => {
    const redis = new FakeRedis();
    configureRedis(redis);
    const { getRefreshCoordinator } = await loadCoordinator();
    const operation = vi.fn(async () => ({
      flight: { status: "completed" as const, sealedSession: "boop1:sealed" },
      value: "owner-session"
    }));

    await expect(getRefreshCoordinator().coordinate("basic", operation)).resolves.toEqual({
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
    configureRedis(redis);
    await redis.set(
      resultKey("existing"),
      JSON.stringify({ status: "failed", outcome: "terminal" }),
      "EX",
      5
    );
    const { getRefreshCoordinator } = await loadCoordinator();
    const operation = vi.fn(async () => ({
      flight: { status: "completed" as const, sealedSession: "unused" }
    }));

    await expect(getRefreshCoordinator().coordinate("existing", operation)).resolves.toEqual({
      source: "shared",
      flight: { status: "failed", outcome: "terminal" }
    });
    expect(operation).not.toHaveBeenCalled();
  });

  it("allows only one of two independent coordinators to execute", async () => {
    const redis = new FakeRedis();
    configureRedis(redis);
    const firstCoordinator = (await loadCoordinator()).getRefreshCoordinator();
    const secondCoordinator = (await loadCoordinator()).getRefreshCoordinator();
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
    configureRedis(redis);
    const { getRefreshCoordinator } = await loadCoordinator();
    redis.beforeGet = (key) => {
      if (key === resultKey("acquire-race")) {
        void redis.set(
          key,
          JSON.stringify({ status: "completed", sealedSession: "boop1:already-rotated" }),
          "EX",
          5
        );
      }
    };
    const operation = vi.fn(async () => ({
      flight: { status: "completed" as const, sealedSession: "wrong" }
    }));

    await expect(getRefreshCoordinator().coordinate("acquire-race", operation)).resolves.toEqual({
      source: "shared",
      flight: { status: "completed", sealedSession: "boop1:already-rotated" }
    });
    expect(operation).not.toHaveBeenCalled();
  });

  it("waits for a legitimate slow active owner", async () => {
    vi.useFakeTimers();
    try {
      const redis = new FakeRedis();
      configureRedis(redis);
      const firstCoordinator = (await loadCoordinator()).getRefreshCoordinator();
      const secondCoordinator = (await loadCoordinator()).getRefreshCoordinator();
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
      configureRedis(redis);
      await redis.set(leaseKey("orphaned"), "dead-owner", "EX", 30);
      const { getRefreshCoordinator } = await loadCoordinator();
      const operation = vi.fn(async () => ({
        flight: { status: "completed" as const, sealedSession: "boop1:recovered" }
      }));
      const follower = getRefreshCoordinator().coordinate("orphaned", operation);
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
    configureRedis(redis);
    const { getRefreshCoordinator } = await loadCoordinator();
    redis.beforeEval = () => {
      void redis.set(leaseKey("ownership"), "new-owner", "EX", 30);
    };

    await getRefreshCoordinator().coordinate("ownership", async () => ({
      flight: { status: "completed" as const, sealedSession: "boop1:owned" }
    }));
    expect(await redis.get(leaseKey("ownership"))).toBe("new-owner");
  });

  it("retains the lease when result publication fails", async () => {
    vi.useFakeTimers();
    try {
      const redis = new FakeRedis();
      configureRedis(redis);
      redis.failNextResultPublication = true;
      const owner = (await loadCoordinator()).getRefreshCoordinator();
      const follower = (await loadCoordinator()).getRefreshCoordinator();

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
      configureRedis(redis);
      const coordinator = (await loadCoordinator()).getRefreshCoordinator();
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
    configureRedis(redis);
    const coordinator = (await loadCoordinator()).getRefreshCoordinator();
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
      configureRedis(redis);
      const coordinator = (await loadCoordinator()).getRefreshCoordinator();
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
