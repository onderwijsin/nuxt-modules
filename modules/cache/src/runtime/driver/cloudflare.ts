import { ofetch } from "ofetch";
import type { Driver } from "unstorage";
import { z } from "zod";
import { createCacheDriver } from "./cache";
import { getCacheIndexPrefix, normalizeCacheBase } from "./keys";
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
      try {
        await bulkDeleteCloudflareCacheKeys(keys, credentials);
      } catch (error) {
        const scope = base ? `cache base ${base}` : "the complete cache mount";
        throw new Error(`Cloudflare cache clear failed for ${scope}.`, { cause: error });
      }
    }
  };
}

/**
 * Bulk deletes Cloudflare KV keys on behalf of the Cloudflare cache driver.
 * @param keys - Fully qualified KV keys to delete.
 * @param options - Server-only Cloudflare account and namespace credentials.
 * @returns Nothing once all Cloudflare requests complete.
 */
async function bulkDeleteCloudflareCacheKeys(
  keys: string[],
  options: Pick<CloudflareCacheDriverOptions, "accountId" | "kvApiToken" | "cacheNamespaceId">
): Promise<void> {
  if (!keys.length) return;

  const client = ofetch.create({
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${options.accountId}`,
    headers: { Authorization: `Bearer ${options.kvApiToken}` }
  });
  for (let index = 0; index < keys.length; index += 10_000) {
    const chunk = keys.slice(index, index + 10_000);
    const chunkNumber = index / 10_000 + 1;
    const response = await client<CloudflareBulkDeleteResponse>(
      `/storage/kv/namespaces/${options.cacheNamespaceId}/bulk/delete`,
      { method: "POST", body: chunk }
    );
    if (!response.success) {
      throw new Error(
        `Cloudflare KV bulk delete failed for chunk ${chunkNumber}: ${formatCloudflareErrors(response.errors)}`
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
  base: string | undefined,
  transactionOptions: Record<string, unknown> = {}
): Promise<string[]> {
  const cacheBase = base
    ? normalizeCacheBase(base.endsWith(":") ? base.slice(0, -1) : base)
    : undefined;
  const valuePrefix = cacheBase ? `${cacheBase}:` : "";
  const indexPrefix = getCacheIndexPrefix(cacheBase);
  const valueAndMetadataKeys = (await driver.getKeys(valuePrefix, transactionOptions)).filter(
    (key) => key.startsWith(valuePrefix)
  );
  const indexKeys = (await driver.getKeys(indexPrefix, transactionOptions)).filter((key) =>
    key.startsWith(indexPrefix)
  );
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
