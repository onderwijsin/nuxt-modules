import { useStorage } from "nitropack/runtime";

import { createMemoryCoordinator } from "./memory";
import { createRedisCoordinator } from "./redis";

export const REFRESH_STORAGE_MOUNT = "directus-auth-refresh";
export const REFRESH_LEASE_SECONDS = 30;
export const REFRESH_RESULT_SECONDS = 5;
export const REFRESH_TRANSIENT_RESULT_SECONDS = 1;
export const REFRESH_WAIT_TIMEOUT_MS = 12_000;
export const REFRESH_POLL_INTERVAL_MS = 100;

export interface CompletedRefreshFlight {
  readonly status: "completed";
  readonly sealedSession: string;
}

export interface FailedRefreshFlight {
  readonly status: "failed";
  readonly outcome: "terminal" | "transient";
}

export type RefreshFlight = CompletedRefreshFlight | FailedRefreshFlight;

export interface RefreshOwnerResult<T> {
  readonly flight: RefreshFlight;
  readonly value?: T;
  readonly error?: unknown;
}

export type CoordinatedRefreshResult<T> =
  | ({ readonly source: "owner" } & RefreshOwnerResult<T>)
  | { readonly source: "shared"; readonly flight: RefreshFlight };

export interface RefreshCoordinator {
  coordinate<T>(
    refreshKey: string,
    operation: () => Promise<RefreshOwnerResult<T>>
  ): Promise<CoordinatedRefreshResult<T>>;
}

export type RefreshStorageDriver = ReturnType<ReturnType<typeof useStorage>["getMount"]>["driver"];

/**
 * Selects the result reuse window for a reusable refresh outcome.
 *
 * @param flight - The reusable result published to followers.
 * @returns The result lifetime in seconds.
 */
export function getRefreshFlightTtlSeconds(flight: RefreshFlight): number {
  if (flight.status === "failed" && flight.outcome === "transient") {
    return REFRESH_TRANSIENT_RESULT_SECONDS;
  }
  return REFRESH_RESULT_SECONDS;
}

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
