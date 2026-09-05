import { isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";
import { useStorage } from "nitropack/runtime";

const REFRESH_STORAGE_MOUNT = "directus-auth-refresh";
const REFRESH_LEASE_SECONDS = 30;
const REFRESH_RESULT_SECONDS = 5;
const REFRESH_WAIT_TIMEOUT_MS = 3_000;
const REFRESH_POLL_INTERVAL_MS = 100;

const releaseLeaseScript = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

export interface CompletedRefreshFlight {
  readonly status: "completed";
  readonly sealedSession: string;
}

export interface FailedRefreshFlight {
  readonly status: "failed";
  readonly outcome: "terminal" | "transient";
}

export type RefreshFlight = CompletedRefreshFlight | FailedRefreshFlight;

export interface RefreshOperationResult<T> {
  readonly flight: RefreshFlight;
  readonly value?: T;
  readonly error?: unknown;
}

export interface RefreshCoordinator {
  coordinate<T>(
    key: string,
    operation: () => Promise<RefreshOperationResult<T>>
  ): Promise<RefreshOperationResult<T>>;
}

interface MemoryEntry {
  readonly promise: Promise<RefreshOperationResult<unknown>>;
  expiresAt: number;
}

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...arguments_: Array<string | number>): Promise<unknown>;
  eval(script: string, keyCount: number, key: string, owner: string): Promise<unknown>;
}

interface StorageDriver {
  readonly name?: string;
  readonly options?: { readonly base?: string };
  getInstance?: () => unknown;
}

interface StorageMount {
  readonly driver?: StorageDriver;
}

function serializeFlight(flight: RefreshFlight): string {
  return JSON.stringify(flight);
}

function parseFlight(value: string | null): RefreshFlight | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || !isString(parsed.status)) return undefined;
    if (parsed.status === "completed" && isString(parsed.sealedSession)) {
      return { status: "completed", sealedSession: parsed.sealedSession };
    }
    if (
      parsed.status === "failed" &&
      (parsed.outcome === "terminal" || parsed.outcome === "transient")
    ) {
      return { status: "failed", outcome: parsed.outcome };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function normalizeBase(base: string | undefined): string {
  return base?.replace(/:+$/, "") ?? "";
}

function createRedisKey(base: string, refreshKey: string, suffix: "lease" | "result"): string {
  const prefix = normalizeBase(base);
  const namespace = `directus-auth-refresh:{${refreshKey}}:${suffix}`;
  return prefix ? `${prefix}:${namespace}` : namespace;
}

function isSuccessfulSet(value: unknown): boolean {
  return value === "OK" || value === true;
}

function createMemoryCoordinator(): RefreshCoordinator {
  const entries = new Map<string, MemoryEntry>();

  return {
    coordinate<T>(
      key: string,
      operation: () => Promise<RefreshOperationResult<T>>
    ): Promise<RefreshOperationResult<T>> {
      const now = Date.now();
      const existing = entries.get(key);
      if (existing && existing.expiresAt > now) {
        return existing.promise as Promise<RefreshOperationResult<T>>;
      }
      if (existing) entries.delete(key);

      const promise = operation();
      const entry: MemoryEntry = {
        promise: promise as Promise<RefreshOperationResult<unknown>>,
        expiresAt: now + REFRESH_LEASE_SECONDS * 1_000
      };
      entries.set(key, entry);
      void promise.then(
        () => {
          if (entries.get(key) === entry) {
            entry.expiresAt = Date.now() + REFRESH_RESULT_SECONDS * 1_000;
          }
        },
        () => {
          if (entries.get(key) === entry) entries.delete(key);
        }
      );
      return promise;
    }
  };
}

function createRedisCoordinator(driver: StorageDriver): RefreshCoordinator {
  const getClient = (): RedisClient => {
    const instance = driver.getInstance?.();
    if (!isRecord(instance)) {
      throw new Error("Directus refresh Redis storage does not expose a compatible client");
    }
    if (typeof instance.get !== "function" || typeof instance.set !== "function") {
      throw new Error("Directus refresh Redis storage does not expose a compatible client");
    }
    return instance as unknown as RedisClient;
  };

  return {
    async coordinate<T>(
      key: string,
      operation: () => Promise<RefreshOperationResult<T>>
    ): Promise<RefreshOperationResult<T>> {
      const client = getClient();
      const base = driver.options?.base ?? "";
      const leaseKey = createRedisKey(base, key, "lease");
      const resultKey = createRedisKey(base, key, "result");
      const owner = crypto.randomUUID();

      let acquired = false;
      try {
        const deadline = Date.now() + REFRESH_WAIT_TIMEOUT_MS;
        while (!acquired) {
          const existing = parseFlight(await client.get(resultKey));
          if (existing) return { flight: existing } as RefreshOperationResult<T>;
          acquired = isSuccessfulSet(
            await client.set(leaseKey, owner, "NX", "EX", REFRESH_LEASE_SECONDS)
          );
          if (acquired) break;
          if (Date.now() >= deadline) {
            throw new Error("Directus refresh coordination timed out");
          }
          const lease = await client.get(leaseKey);
          if (lease) {
            await new Promise<void>((resolve) => setTimeout(resolve, REFRESH_POLL_INTERVAL_MS));
          }
        }

        const outcome = await operation();
        try {
          await client.set(
            resultKey,
            serializeFlight(outcome.flight),
            "EX",
            REFRESH_RESULT_SECONDS
          );
        } catch {
          // The local session outcome remains authoritative if publication fails.
        }
        return outcome;
      } finally {
        if (acquired) {
          try {
            await client.eval(releaseLeaseScript, 1, leaseKey, owner);
          } catch {
            // A lost lease must never be deleted by a later owner.
          }
        }
      }
    }
  };
}

let coordinatorPromise: Promise<RefreshCoordinator> | undefined;

/**
 * Resolves the supported refresh coordinator from the root Nitro storage mount.
 *
 * @returns The process-cached memory or Redis coordinator.
 */
export function getRefreshCoordinator(): Promise<RefreshCoordinator> {
  coordinatorPromise ??= Promise.resolve().then(() => {
    const rootStorage = useStorage();
    const mount = rootStorage.getMount(REFRESH_STORAGE_MOUNT) as StorageMount | undefined;
    const driver = mount?.driver;
    if (driver?.name === "memory") return createMemoryCoordinator();
    if (driver?.name === "redis") return createRedisCoordinator(driver);
    throw new Error(`Unsupported Directus refresh storage driver: ${driver?.name ?? "missing"}`);
  });
  return coordinatorPromise;
}

export const refreshCoordinatorConfig = {
  leaseSeconds: REFRESH_LEASE_SECONDS,
  resultSeconds: REFRESH_RESULT_SECONDS,
  waitTimeoutMs: REFRESH_WAIT_TIMEOUT_MS
} as const;
