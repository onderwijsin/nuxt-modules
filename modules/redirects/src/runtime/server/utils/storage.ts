import type { Redirect, RedirectIndex, ResolvedRedirect } from "../../../types/redirect";

import { useRuntimeConfig, useStorage } from "nitropack/runtime";
import type { Storage } from "unstorage";

import { toRedirectOrigin, toRedirectPath, toRedirectStorageKey } from "./path";
import { normalizeRedirect } from "./validation";
import { invalidateRedirectCache, primeRedirectLookupCache } from "./cache";

const MANIFEST_KEY = "manifest";

interface RedirectManifest {
  redirects: RedirectIndex;
  updatedAt: string;
}

/**
 * Returns the configured redirects Nitro storage mount.
 *
 * The mount contains two kinds of records: a compact `manifest` used by the list endpoint and one
 * `entries:<encoded-origin>` record per redirect used by the request hot path. Keeping the manifest
 * separate avoids key enumeration for client refreshes, while individual records keep redirect
 * middleware lookups O(1). The mount defaults to Nitro's normal storage behavior; consumers may
 * select any configured Nitro mount through `redirects.storageMount`.
 *
 * @returns Redirect index storage for the configured mount.
 */
export function useRedirectStorage(): Storage {
  return useStorage(useRuntimeConfig().redirects?.storageMount ?? "redirects");
}

/**
 * Reads the compact redirect manifest without listing mount keys.
 *
 * Refreshes write every winning entry first, remove stale entries, then publish this manifest. A
 * failed source fetch therefore leaves the previous index unchanged; a storage-driver failure may
 * leave a short-lived mixed entry set, but the next successful refresh repairs it.
 *
 * @returns The current manifest or an empty initial manifest.
 */
export async function getRedirectManifest(): Promise<RedirectManifest> {
  const manifest = await useRedirectStorage().getItem<RedirectManifest>(MANIFEST_KEY);
  return manifest ?? { redirects: {}, updatedAt: new Date(0).toISOString() };
}

/**
 * Finds a redirect by exact origin first, then by its path-only origin.
 *
 * @param origin - Request path and optional query string.
 * @returns The matching redirect, or null when none exists.
 */
export async function findRedirect(origin: string): Promise<ResolvedRedirect | null> {
  const storage = useRedirectStorage();
  const canonicalOrigin = toRedirectOrigin(origin);
  const exact = await storage.getItem<ResolvedRedirect>(toRedirectStorageKey(canonicalOrigin));
  if (exact) return exact;

  const path = toRedirectPath(canonicalOrigin);
  if (path === canonicalOrigin) return null;
  return (await storage.getItem<ResolvedRedirect>(toRedirectStorageKey(path))) ?? null;
}

/**
 * Replaces the index with merged, ordered source records. Earlier source records win duplicates.
 *
 * All sources have already resolved before this function mutates storage. A local `Map` removes
 * duplicate origins during ingestion without scanning a growing array. Writes occur off the request
 * path: entries are written first, obsolete entries are removed second, and the list manifest is
 * published last so the public index never needs to enumerate storage keys.
 *
 * @param sourceResults - Redirect arrays in source discovery order.
 * @returns The winning redirect records keyed by normalized origin.
 */
export async function refreshRedirectStorage(
  sourceResults: readonly (readonly Redirect[])[]
): Promise<RedirectIndex> {
  const redirects = new Map<string, ResolvedRedirect>();

  for (const [sourceIndex, source] of sourceResults.entries()) {
    for (const candidate of source) {
      const redirect = normalizeRedirect(candidate);
      if (redirects.has(redirect.from)) {
        console.warn(
          `[redirects] Ignoring duplicate origin ${JSON.stringify(redirect.from)} from source ${sourceIndex + 1}; the first source entry wins.`
        );
        continue;
      }
      redirects.set(redirect.from, redirect);
    }
  }

  const next: RedirectIndex = {};
  for (const [origin, redirect] of redirects) next[origin] = redirect;
  const storage = useRedirectStorage();
  const previous = await getRedirectManifest();

  await Promise.all(
    [...redirects.values()].map((redirect) =>
      storage.setItem(toRedirectStorageKey(redirect.from), redirect)
    )
  );
  await Promise.all(
    Object.keys(previous.redirects)
      .filter((origin) => !redirects.has(origin))
      .map((origin) => storage.removeItem(toRedirectStorageKey(origin)))
  );
  await storage.setItem<RedirectManifest>(MANIFEST_KEY, {
    redirects: next,
    updatedAt: new Date().toISOString()
  });
  await invalidateRedirectCache();

  return next;
}

/**
 * Adds or replaces one redirect after consumer-specific webhook validation.
 * Invalidates the public index and affected lookup cache, then immediately primes the new lookup.
 *
 * @param value - Provider-mapped redirect record.
 * @returns The normalized record written to the index.
 */
export async function upsertRedirect(value: Redirect): Promise<ResolvedRedirect> {
  const redirect = normalizeRedirect(value);
  const storage = useRedirectStorage();
  const manifest = await getRedirectManifest();
  const redirects = { ...manifest.redirects, [redirect.from]: redirect };

  await storage.setItem(toRedirectStorageKey(redirect.from), redirect);
  await storage.setItem<RedirectManifest>(MANIFEST_KEY, {
    redirects,
    updatedAt: new Date().toISOString()
  });
  await invalidateRedirectCache(redirect.from);
  await primeRedirectLookupCache(redirect.from);
  return redirect;
}

/**
 * Removes one redirect after consumer-specific webhook validation.
 * The affected public cache entries are invalidated after the storage mutation.
 *
 * @param origin - Provider-mapped redirect origin.
 */
export async function removeRedirect(origin: string): Promise<void> {
  const canonicalOrigin = toRedirectOrigin(origin);
  const storage = useRedirectStorage();
  const manifest = await getRedirectManifest();

  await storage.removeItem(toRedirectStorageKey(canonicalOrigin));
  const redirects = { ...manifest.redirects };
  delete redirects[canonicalOrigin];
  await storage.setItem<RedirectManifest>(MANIFEST_KEY, {
    redirects,
    updatedAt: new Date().toISOString()
  });
  await invalidateRedirectCache(canonicalOrigin);
}
