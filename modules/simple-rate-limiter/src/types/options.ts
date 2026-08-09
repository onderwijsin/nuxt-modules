/** Public configuration for the simple rate limiter module. */
export interface ModuleOptions {
  /** Global rate limiting configuration. */
  global?: {
    /** Whether path-scoped requests should be recorded in the global store. */
    enabled?: boolean;
    /** Optional maintenance task for stale global records. */
    pruning?: {
      /** Whether to register the Nitro pruning task. */
      enabled?: boolean;
      /** Cron expression used to schedule the pruning task. */
      cron?: string;
      /** Minimum timestamp retention in seconds. */
      staleAfter?: number;
    };
  };
}
