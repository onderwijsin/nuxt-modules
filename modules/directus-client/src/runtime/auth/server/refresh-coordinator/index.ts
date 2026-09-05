import { useStorage } from "nitropack/runtime";

import { createMemoryCoordinator } from "./memory";
import { createRedisCoordinator } from "./redis";
import type { RefreshCoordinator } from "./shared";

export {
  getRefreshFlightTtlSeconds,
  REFRESH_LEASE_TTL_SECONDS,
  REFRESH_POLL_INTERVAL_MS,
  REFRESH_RESULT_TTL_SECONDS,
  REFRESH_TRANSIENT_RESULT_TTL_SECONDS,
  REFRESH_WAIT_TIMEOUT_MS
} from "./shared";
export type {
  CoordinatedRefreshResult,
  CompletedRefreshFlight,
  FailedRefreshFlight,
  RefreshCoordinator,
  RefreshFlight,
  RefreshOwnerResult
} from "./shared";

export const REFRESH_STORAGE_MOUNT = "directus-auth-refresh";

function createRefreshCoordinator(): RefreshCoordinator {
  const driver = useStorage().getMount(REFRESH_STORAGE_MOUNT).driver;
  if (driver.name === "memory") return createMemoryCoordinator();
  if (driver.name === "redis") return createRedisCoordinator(driver);
  throw new Error(`Unsupported Directus refresh storage driver: ${driver.name ?? "missing"}`);
}

let coordinator: RefreshCoordinator | undefined;

/**
 * Returns the process-local coordinator selected from the root Nitro storage mount.
 *
 * @returns The cached memory or Redis coordinator.
 */
export function getRefreshCoordinator(): RefreshCoordinator {
  return (coordinator ??= createRefreshCoordinator());
}
