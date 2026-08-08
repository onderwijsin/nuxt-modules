/** One storage item returned by the administrative listing endpoint. */
export interface StorageListEntry {
  key: string;
  path: string | null;
  metadata?: Record<string, unknown> | null;
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

const STORAGE_LISTING_CONCURRENCY = 8;
const STORAGE_LISTING_DEADLINE_MS = 10_000;

/** Error thrown when a storage listing operation exceeds its response deadline. */
export class StorageListingDeadlineError extends Error {}

/**
 * Resolves an operation or rejects when its response deadline elapses.
 *
 * Unstorage's portable API does not expose cancellation, so the underlying driver operation can
 * continue after this promise rejects. Callers must treat this as a response deadline, not abort.
 * @param operation Storage operation to wait for.
 * @returns The operation result.
 */
export function withStorageListingDeadline<T>(operation: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new StorageListingDeadlineError()),
      STORAGE_LISTING_DEADLINE_MS
    );
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
  operation: (value: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let index = 0; index < values.length; index += STORAGE_LISTING_CONCURRENCY) {
    const batch = values.slice(index, index + STORAGE_LISTING_CONCURRENCY);
    results.push(...(await Promise.all(batch.map(operation))));
  }

  return results;
}
