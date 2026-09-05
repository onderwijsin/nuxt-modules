import {
  getRefreshFlightTtlSeconds,
  REFRESH_LEASE_TTL_SECONDS,
  type CoordinatedRefreshResult,
  type RefreshCoordinator,
  type RefreshFlight,
  type RefreshOwnerResult
} from "./shared";

interface MemoryFlightEntry {
  readonly sharedFlight: Promise<RefreshFlight>;
  expiresAt: number;
  settled: boolean;
}

/**
 * Removes settled memory flights whose reusable result has expired.
 *
 * Pending flights are intentionally retained until they settle so cleanup cannot
 * allow a second owner while the original refresh is still running.
 *
 * @param flights - The process-local refresh-flight map.
 * @param now - The current timestamp in milliseconds.
 */
export function pruneExpiredFlights<T extends { expiresAt: number; settled: boolean }>(
  flights: Map<string, T>,
  now: number
): void {
  for (const [refreshKey, entry] of flights) {
    if (entry.settled && entry.expiresAt <= now) flights.delete(refreshKey);
  }
}

function sharedResult<T>(flight: RefreshFlight): CoordinatedRefreshResult<T> {
  return { source: "shared", flight };
}

/**
 * Creates the process-local refresh coordinator.
 *
 * @returns A coordinator that shares reusable flights but never owner-local values.
 */
export function createMemoryCoordinator(): RefreshCoordinator {
  const flights = new Map<string, MemoryFlightEntry>();

  return {
    coordinate<T>(
      refreshKey: string,
      operation: () => Promise<RefreshOwnerResult<T>>
    ): Promise<CoordinatedRefreshResult<T>> {
      const now = Date.now();
      pruneExpiredFlights(flights, now);
      const existing = flights.get(refreshKey);
      if (existing) {
        return existing.sharedFlight.then((flight) => sharedResult<T>(flight));
      }

      const ownerResult = operation();
      const sharedFlight = ownerResult.then((result) => result.flight);
      const entry: MemoryFlightEntry = {
        sharedFlight,
        expiresAt: now + REFRESH_LEASE_TTL_SECONDS * 1_000,
        settled: false
      };
      flights.set(refreshKey, entry);

      void sharedFlight.then(
        (flight) => {
          if (flights.get(refreshKey) === entry) {
            entry.settled = true;
            entry.expiresAt = Date.now() + getRefreshFlightTtlSeconds(flight) * 1_000;
          }
        },
        () => {
          if (flights.get(refreshKey) === entry) flights.delete(refreshKey);
        }
      );

      return ownerResult.then((result) => ({ source: "owner", ...result }));
    }
  };
}
