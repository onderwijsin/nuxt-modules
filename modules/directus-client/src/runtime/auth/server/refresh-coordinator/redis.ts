import { isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

import {
  getRefreshFlightTtlSeconds,
  REFRESH_LEASE_SECONDS,
  REFRESH_POLL_INTERVAL_MS,
  REFRESH_WAIT_TIMEOUT_MS,
  type CoordinatedRefreshResult,
  type RefreshCoordinator,
  type RefreshFlight,
  type RefreshOwnerResult,
  type RefreshStorageDriver
} from "./index";

interface RefreshRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...arguments_: Array<string | number>): Promise<unknown>;
  eval(script: string, keyCount: number, key: string, owner: string): Promise<unknown>;
}

const releaseLeaseScript = `
-- Release only the lease owned by this refresh flight. A lease may have expired
-- and been acquired by another process while the owner was finishing.
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

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

function createKey(base: string, refreshKey: string, suffix: "lease" | "result"): string {
  const prefix = base.replace(/:+$/, "");
  const key = `directus-auth-refresh:{${refreshKey}}:${suffix}`;
  return prefix ? `${prefix}:${key}` : key;
}

function isRefreshRedisClient(value: unknown): value is RefreshRedisClient {
  return (
    isRecord(value) &&
    typeof value.get === "function" &&
    typeof value.set === "function" &&
    typeof value.eval === "function"
  );
}

function getRedisClient(driver: RefreshStorageDriver): RefreshRedisClient {
  const instance = driver.getInstance?.();
  if (!isRefreshRedisClient(instance)) {
    throw new Error("Directus refresh Redis storage does not expose a compatible client");
  }
  return instance;
}

function isLeaseAcquired(response: unknown): boolean {
  return response === "OK" || response === true;
}

async function getPublishedFlight(
  client: RefreshRedisClient,
  resultKey: string
): Promise<RefreshFlight | undefined> {
  return parseFlight(await client.get(resultKey));
}

async function tryAcquireLease(
  client: RefreshRedisClient,
  leaseKey: string,
  leaseOwner: string
): Promise<boolean> {
  return isLeaseAcquired(await client.set(leaseKey, leaseOwner, "NX", "EX", REFRESH_LEASE_SECONDS));
}

async function releaseLease(
  client: RefreshRedisClient,
  leaseKey: string,
  leaseOwner: string
): Promise<void> {
  await client.eval(releaseLeaseScript, 1, leaseKey, leaseOwner);
}

async function publishFlight(
  client: RefreshRedisClient,
  resultKey: string,
  flight: RefreshFlight
): Promise<void> {
  await client.set(resultKey, JSON.stringify(flight), "EX", getRefreshFlightTtlSeconds(flight));
}

async function waitForPublishedFlight(
  client: RefreshRedisClient,
  resultKey: string,
  leaseKey: string,
  waitDeadline: number
): Promise<RefreshFlight | undefined> {
  while (Date.now() < waitDeadline) {
    const publishedFlight = await getPublishedFlight(client, resultKey);
    if (publishedFlight) return publishedFlight;
    if (!(await client.get(leaseKey))) return undefined;
    await new Promise<void>((resolve) => setTimeout(resolve, REFRESH_POLL_INTERVAL_MS));
  }
  throw new Error("Directus refresh coordination timed out");
}

/**
 * Creates the Redis-backed refresh coordinator.
 *
 * @param driver - The configured Redis driver from the root Nitro mount.
 * @returns A coordinator using the driver's existing Redis client.
 */
export function createRedisCoordinator(driver: RefreshStorageDriver): RefreshCoordinator {
  return {
    async coordinate<T>(
      refreshKey: string,
      operation: () => Promise<RefreshOwnerResult<T>>
    ): Promise<CoordinatedRefreshResult<T>> {
      const client = getRedisClient(driver);
      const base = driver.options?.base ?? "";
      const leaseKey = createKey(base, refreshKey, "lease");
      const resultKey = createKey(base, refreshKey, "result");
      const leaseOwner = crypto.randomUUID();
      const waitDeadline = Date.now() + REFRESH_WAIT_TIMEOUT_MS;
      let acquired = false;
      let canReleaseLease = false;

      try {
        while (!acquired) {
          const publishedFlight = await getPublishedFlight(client, resultKey);
          if (publishedFlight) return { source: "shared", flight: publishedFlight };

          acquired = await tryAcquireLease(client, leaseKey, leaseOwner);
          if (acquired) {
            const flightAfterAcquire = await getPublishedFlight(client, resultKey);
            if (flightAfterAcquire) {
              canReleaseLease = true;
              return { source: "shared", flight: flightAfterAcquire };
            }
            break;
          }

          const waitedFlight = await waitForPublishedFlight(
            client,
            resultKey,
            leaseKey,
            waitDeadline
          );
          if (waitedFlight) return { source: "shared", flight: waitedFlight };
        }

        const ownerResult = await operation();
        try {
          await publishFlight(client, resultKey, ownerResult.flight);
          canReleaseLease = true;
        } catch {
          // The local owner result remains authoritative. Retain the lease until
          // expiry so a stale caller cannot immediately retry a rotated token.
        }
        return { source: "owner", ...ownerResult };
      } finally {
        if (acquired && canReleaseLease) {
          try {
            await releaseLease(client, leaseKey, leaseOwner);
          } catch {
            // Releasing is best effort; compare-and-delete protects later owners.
          }
        }
      }
    }
  };
}
