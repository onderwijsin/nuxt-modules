import {
  getRefreshFlightTtlSeconds,
  REFRESH_LEASE_SECONDS,
  type CoordinatedRefreshResult,
  type RefreshCoordinator,
  type RefreshFlight,
  type RefreshOwnerResult
} from "./index";

interface MemoryFlightEntry {
  readonly sharedFlight: Promise<RefreshFlight>;
  expiresAt: number;
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
      const existing = flights.get(refreshKey);
      if (existing && existing.expiresAt > now) {
        return existing.sharedFlight.then((flight) => sharedResult<T>(flight));
      }
      if (existing) flights.delete(refreshKey);

      const ownerResult = operation();
      const sharedFlight = ownerResult.then((result) => result.flight);
      const entry: MemoryFlightEntry = {
        sharedFlight,
        expiresAt: now + REFRESH_LEASE_SECONDS * 1_000
      };
      flights.set(refreshKey, entry);

      void sharedFlight.then(
        (flight) => {
          if (flights.get(refreshKey) === entry) {
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
