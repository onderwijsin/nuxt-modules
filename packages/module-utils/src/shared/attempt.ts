/** The result of an attempted operation whose failure is represented as data instead of a thrown error. */
export type AttemptResult<T> = { data: T; error: null } | { data: null; error: unknown };

/**
 * Attempts an async operation and exposes a possible failure as data.
 *
 * @param operation - The operation to execute.
 * @returns The operation result or the captured error.
 */
export async function attempt<T>(operation: () => T | Promise<T>): Promise<AttemptResult<T>> {
  return Promise.resolve()
    .then(operation)
    .then(
      (data) => ({ data, error: null }) as AttemptResult<T>,
      (error) => ({ data: null, error }) as AttemptResult<T>
    );
}

/**
 * Attempts a synchronous operation and exposes a possible failure as data.
 *
 * @param operation - The operation to execute.
 * @returns The operation result or the captured error.
 */
export function attemptSync<T>(operation: () => T): AttemptResult<T> {
  try {
    const data = operation();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/** Options controlling bounded retries for attempted operations. */
export type AttemptRetryOptions = {
  /** Total number of times to execute the operation. */
  attempts?: number;
  /** Initial delay in milliseconds before retrying. */
  delayMs?: number;
  /** Whether to double the duration of each delay. @default true */
  exponentialBackoff?: boolean;
};

/**
 * Attempts an operation until it succeeds or exhausts a bounded exponential-backoff retry budget.
 *
 * @param operation Work that can be safely retried after a rejection.
 * @param options The total attempt count and initial delay between failed attempts.
 * @param options.attempts Total number of operation executions.
 * @param options.delayMs Initial delay before the first retry in milliseconds.
 * @param options.exponentialBackoff Whether each retry delay doubles.
 * @returns The successful result or the error from the final attempt.
 */
export async function attemptWithRetry<T>(
  operation: () => T | Promise<T>,
  { attempts = 3, delayMs = 250, exponentialBackoff = true }: AttemptRetryOptions = {}
): Promise<AttemptResult<T>> {
  let result = await attempt(operation);

  for (
    let attemptNumber = 1;
    result.error !== null && attemptNumber < attempts;
    attemptNumber += 1
  ) {
    await new Promise<void>((resolve) => {
      const delay = exponentialBackoff ? delayMs * 2 ** (attemptNumber - 1) : delayMs;
      setTimeout(resolve, delay);
    });

    result = await attempt(operation);
  }

  return result;
}
