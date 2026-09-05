export const REFRESH_LEASE_TTL_SECONDS = 30;
export const REFRESH_RESULT_TTL_SECONDS = 5;
export const REFRESH_TRANSIENT_RESULT_TTL_SECONDS = 1;
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

export type RefreshOwnerResult<T> =
  | {
      readonly flight: CompletedRefreshFlight;
      readonly value: T;
    }
  | {
      readonly flight: FailedRefreshFlight;
      readonly error?: unknown;
    };

export type CoordinatedRefreshResult<T> =
  | {
      readonly source: "owner";
      readonly flight: CompletedRefreshFlight;
      readonly value: T;
    }
  | {
      readonly source: "owner";
      readonly flight: FailedRefreshFlight;
      readonly error?: unknown;
    }
  | { readonly source: "shared"; readonly flight: RefreshFlight };

export interface RefreshCoordinator {
  coordinate<T>(
    refreshKey: string,
    operation: () => Promise<RefreshOwnerResult<T>>
  ): Promise<CoordinatedRefreshResult<T>>;
}

/**
 * Selects the result reuse window for a reusable refresh outcome.
 *
 * @param flight - The reusable result published to followers.
 * @returns The result lifetime in seconds.
 */
export function getRefreshFlightTtlSeconds(flight: RefreshFlight): number {
  if (flight.status === "failed" && flight.outcome === "transient") {
    return REFRESH_TRANSIENT_RESULT_TTL_SECONDS;
  }
  return REFRESH_RESULT_TTL_SECONDS;
}
