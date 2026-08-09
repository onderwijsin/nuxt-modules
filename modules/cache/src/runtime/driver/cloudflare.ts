import { ofetch } from "ofetch";
import type { Driver } from "unstorage";
import { z } from "zod";
import { createCacheDriver } from "./cache";
import { getCacheIndexPrefix } from "./keys";
import type { CloudflareCacheDriverOptions } from "./types";

const cloudflareCredentialsSchema = z.strictObject({
  accountId: z.string().trim().min(1),
  kvApiToken: z.string().trim().min(1),
  cacheNamespaceId: z.string().trim().min(1)
});

/** Shape returned by Cloudflare's KV bulk-delete endpoint. */
interface CloudflareBulkDeleteResponse {
  errors?: Array<{ code?: number; message?: string }>;
  success: boolean;
}

/**
 * Wraps a Cloudflare KV driver with metadata/index support and bulk clear operations.
 * @param driver - Cloudflare KV Unstorage driver.
 * @param options - Cloudflare API credentials and optional request-path resolver.
 * @returns A cache driver with Cloudflare KV bulk deletion for `clear()`.
 */
export function createCloudflareCacheDriver(
  driver: Driver,
  options: CloudflareCacheDriverOptions
): Driver {
  const credentials = cloudflareCredentialsSchema.parse({
    accountId: options.accountId,
    kvApiToken: options.kvApiToken,
    cacheNamespaceId: options.cacheNamespaceId
  });
  const cacheDriver = createCacheDriver(driver, options);

  return {
    ...cacheDriver,
    async clear(base, transactionOptions) {
      // The KV binding only offers one-delete-per-key; use the REST bulk endpoint instead.
      const keys = await getCloudflareClearKeys(driver, base, transactionOptions);
      await bulkDeleteCloudflareCacheKeys(keys, credentials);
    }
  };
}

/**
 * Bulk deletes keys from a Cloudflare KV namespace.
 * @param keys - Fully qualified KV keys to remove.
 * @param options - Cloudflare account and namespace credentials.
 * @returns Nothing once every Cloudflare bulk-delete request succeeds.
 */
export async function bulkDeleteCloudflareCacheKeys(
  keys: string[],
  options: Pick<CloudflareCacheDriverOptions, "accountId" | "kvApiToken" | "cacheNamespaceId">
): Promise<void> {
  if (!keys.length) return;

  const client = ofetch.create({
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${options.accountId}`,
    headers: { Authorization: `Bearer ${options.kvApiToken}` }
  });
  for (let index = 0; index < keys.length; index += 10_000) {
    const response = await client<CloudflareBulkDeleteResponse>(
      `/storage/kv/namespaces/${options.cacheNamespaceId}/bulk/delete`,
      { method: "POST", body: keys.slice(index, index + 10_000) }
    );
    if (!response.success) {
      throw new Error(
        `Cloudflare KV bulk delete failed: ${formatCloudflareErrors(response.errors)}`
      );
    }
  }
}

/**
 * Collects all value, sidecar, and reverse-index keys that belong to a cache base.
 * @param driver - Raw Cloudflare binding driver; it must expose internal records to this operation.
 * @param base - Cache base to clear.
 * @param transactionOptions - Unstorage options forwarded to key listing.
 * @returns Deduplicated KV keys accepted by Cloudflare's bulk-delete endpoint.
 */
async function getCloudflareClearKeys(
  driver: Driver,
  base: string,
  transactionOptions: Record<string, unknown> = {}
): Promise<string[]> {
  const valueAndMetadataKeys = await driver.getKeys(base, transactionOptions);
  const indexKeys = await driver.getKeys(getCacheIndexPrefix(base), transactionOptions);
  return [...new Set([...valueAndMetadataKeys, ...indexKeys])];
}

/**
 * Formats Cloudflare's optional API errors for an actionable thrown error.
 * @param errors - Errors returned by Cloudflare's bulk-delete endpoint.
 * @returns A human-readable error summary.
 */
function formatCloudflareErrors(errors: CloudflareBulkDeleteResponse["errors"]): string {
  return (
    errors?.map((error) => error.message ?? String(error.code ?? "unknown error")).join(", ") ??
    "unknown error"
  );
}
