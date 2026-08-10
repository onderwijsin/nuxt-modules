/** Public configuration for the simple rate limiter module. */
export interface ModuleOptions {
  /** Whether the module registers its runtime helpers. */
  enabled?: boolean;
  /** Global rate limiting configuration. */
  global?: {
    /** Whether path-scoped requests should be recorded in the global store. */
    enabled?: boolean;
    /** Optional maintenance task for stale global records. */
    pruning?: {
      /** Whether the provided pruning task is enabled. */
      enabled?: boolean;
      /** Minimum timestamp retention in seconds. */
      staleAfter?: number;
    };
  };
}
