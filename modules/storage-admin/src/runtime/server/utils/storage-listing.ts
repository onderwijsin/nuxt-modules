/** One storage item returned by the administrative listing endpoint. */
export interface StorageListEntry {
  key: string;
  metadata: Record<string, unknown> | null;
  path: string | null;
}

/** A cursor or page-number slice of ordered storage-list entries. */
export interface StorageListPage {
  items: StorageListEntry[];
  nextCursor: string | null;
}

/**
 * Returns one stable page from entries sorted by their storage key.
 *
 * A page number takes precedence over a cursor. A cursor advances to the first entry whose key is
 * lexically greater than the cursor, so a deleted cursor item does not prevent progress.
 *
 * @param entries Storage entries sorted in ascending key order.
 * @param pageSize Maximum number of entries to return.
 * @param requestedPage Optional one-based page number.
 * @param cursor Optional key returned by a previous page.
 * @returns The requested entries and an optional continuation key.
 */
export function paginateStorageEntries(
  entries: StorageListEntry[],
  pageSize: number,
  requestedPage?: number,
  cursor?: string
): StorageListPage {
  const startIndex = requestedPage
    ? (requestedPage - 1) * pageSize
    : cursor
      ? entries.findIndex((entry) => entry.key > cursor)
      : 0;

  if (startIndex < 0) return { items: [], nextCursor: null };

  const items = entries.slice(startIndex, startIndex + pageSize);
  const nextCursor =
    startIndex + items.length < entries.length ? (items.at(-1)?.key ?? null) : null;

  return { items, nextCursor };
}

/** Error thrown when a storage listing operation exceeds its configured duration. */
export class StorageListingTimeoutError extends Error {}

/**
 * Resolves an operation or rejects when the configured storage-list timeout elapses.
 * @param operation Storage operation to wait for.
 * @param timeoutMs Maximum time to wait for the operation.
 * @returns The operation result.
 */
export function withStorageListingTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new StorageListingTimeoutError()), timeoutMs);
    operation.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

/**
 * Processes values in fixed-size batches to bound concurrent storage-driver calls.
 * @param values Values to process.
 * @param concurrency Maximum number of concurrent operations.
 * @param operation Async operation for each value.
 * @returns Results in the same order as the input values.
 */
export async function mapWithStorageConcurrency<T, R>(
  values: T[],
  concurrency: number,
  operation: (value: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let index = 0; index < values.length; index += concurrency) {
    const batch = values.slice(index, index + concurrency);
    results.push(...(await Promise.all(batch.map(operation))));
  }

  return results;
}
