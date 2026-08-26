import type {
  DynamicRedirectRule,
  Redirect,
  RedirectIndex,
  ResolvedRedirect
} from "../../types/redirect";

import { useRuntimeConfig, useStorage } from "nitropack/runtime";
import type { Storage } from "unstorage";

import { toRedirectOrigin, toRedirectPath, toRedirectStorageKey } from "./path";
import { normalizeRedirect } from "./validation";
import { invalidateRedirectCache, primeRedirectLookupCache } from "./cache";
import { compileDynamicRedirects, findCompiledDynamicRedirect } from "../../utils/dynamic";
import type { CompiledDynamicRedirect } from "../../utils/dynamic";
import { isRedirectActive } from "../../utils/eligibility";
import { collectRedirectSourceResults } from "./sources";

const MANIFEST_KEY = "manifest";
const DYNAMIC_MANIFEST_CHECK_INTERVAL_MS = 10_000;

interface RedirectManifest {
  exact: RedirectIndex;
  dynamic: DynamicRedirectRule[];
  updatedAt: string;
}

let compiledDynamicRedirects: CompiledDynamicRedirect[] | null = null;
let compiledDynamicUpdatedAt: string | null = null;
let lastDynamicManifestCheckAt = 0;

function dynamicMatchingEnabled(): boolean {
  return useRuntimeConfig().redirects?.dynamicMatching === true;
}

function setDynamicRedirectRules(rules: readonly DynamicRedirectRule[], updatedAt: string): void {
  compiledDynamicRedirects = compileDynamicRedirects(rules);
  compiledDynamicUpdatedAt = updatedAt;
  lastDynamicManifestCheckAt = Date.now();
}

async function ensureDynamicRedirectRules(): Promise<void> {
  const now = Date.now();
  if (
    compiledDynamicRedirects !== null &&
    now - lastDynamicManifestCheckAt < DYNAMIC_MANIFEST_CHECK_INTERVAL_MS
  )
    return;

  const manifest = await getRedirectManifest();
  lastDynamicManifestCheckAt = now;
  if (compiledDynamicUpdatedAt !== manifest.updatedAt)
    setDynamicRedirectRules(manifest.dynamic, manifest.updatedAt);
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
  const manifest = await useRedirectStorage().getItem<
    RedirectManifest & { redirects?: RedirectIndex }
  >(MANIFEST_KEY);
  if (!manifest) return { exact: {}, dynamic: [], updatedAt: new Date(0).toISOString() };
  return {
    exact: manifest.exact ?? manifest.redirects ?? {},
    dynamic: manifest.dynamic ?? [],
    updatedAt: manifest.updatedAt
  };
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
  if (exact && isRedirectActive(exact)) return exact;

  const path = toRedirectPath(canonicalOrigin);
  if (path !== canonicalOrigin) {
    const pathOnly = await storage.getItem<ResolvedRedirect>(toRedirectStorageKey(path));
    if (pathOnly && isRedirectActive(pathOnly)) return pathOnly;
  }

  if (!dynamicMatchingEnabled()) return null;
  await ensureDynamicRedirectRules();
  return findCompiledDynamicRedirect(compiledDynamicRedirects ?? [], path);
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
  const exact = new Map<string, ResolvedRedirect>();
  const dynamic = new Map<string, DynamicRedirectRule>();

  for (const [sourceIndex, source] of sourceResults.entries()) {
    for (const candidate of source) {
      const redirect = normalizeRedirect(candidate);
      if (redirect.match === "pattern" && !dynamicMatchingEnabled()) {
        console.warn(
          `[redirects] Skipping pattern redirect ${JSON.stringify(redirect.from)} because dynamicMatching is disabled.`
        );
        continue;
      }
      if (redirect.match === "pattern") {
        if (dynamic.has(redirect.from)) {
          console.warn(
            `[redirects] Ignoring duplicate dynamic origin ${JSON.stringify(redirect.from)} from source ${sourceIndex + 1}; the first source entry wins.`
          );
          continue;
        }
        dynamic.set(redirect.from, {
          from: redirect.from,
          to: redirect.to,
          statusCode: redirect.statusCode,
          match: "pattern",
          activeFrom: redirect.activeFrom,
          activeUntil: redirect.activeUntil
        });
        continue;
      }
      if (exact.has(redirect.from)) {
        console.warn(
          `[redirects] Ignoring duplicate origin ${JSON.stringify(redirect.from)} from source ${sourceIndex + 1}; the first source entry wins.`
        );
        continue;
      }
      exact.set(redirect.from, redirect);
    }
  }

  const next: RedirectIndex = {};
  for (const [origin, redirect] of exact) next[origin] = redirect;
  const nextDynamic = [...dynamic.values()];
  const storage = useRedirectStorage();
  const previous = await getRedirectManifest();

  await Promise.all(
    [...exact.values()].map((redirect) =>
      storage.setItem(toRedirectStorageKey(redirect.from), redirect)
    )
  );
  await Promise.all(
    Object.keys(previous.exact)
      .filter((origin) => !exact.has(origin))
      .map((origin) => storage.removeItem(toRedirectStorageKey(origin)))
  );
  const updatedAt = new Date().toISOString();
  await storage.setItem<RedirectManifest>(MANIFEST_KEY, {
    exact: next,
    dynamic: nextDynamic,
    updatedAt
  });
  setDynamicRedirectRules(nextDynamic, updatedAt);
  await invalidateRedirectCache();

  return next;
}

/**
 * Adds or replaces one redirect after consumer-specific webhook validation.
 * Pattern mutations rebuild from registered sources because source order is the canonical pattern
 * precedence. The consumer must update its provider before invoking a pattern mutation.
 * Invalidates the public index and affected lookup cache, then immediately primes the new lookup.
 *
 * @param value - Provider-mapped redirect record.
 * @returns The normalized record written to the index.
 */
export async function upsertRedirect(value: Redirect): Promise<ResolvedRedirect> {
  const redirect = normalizeRedirect(value);
  const storage = useRedirectStorage();
  const manifest = await getRedirectManifest();
  if (redirect.match === "pattern" && !dynamicMatchingEnabled())
    throw new Error("Dynamic redirect matching is disabled.");

  if (redirect.match === "pattern") {
    await refreshRedirectStorage(await collectRedirectSourceResults());
    return redirect;
  }

  const exact = { ...manifest.exact };
  const dynamic = [...manifest.dynamic];

  const dynamicIndex = dynamic.findIndex((rule) => rule.from === redirect.from);
  if (dynamicIndex !== -1) dynamic.splice(dynamicIndex, 1);
  exact[redirect.from] = redirect;

  await storage.setItem(toRedirectStorageKey(redirect.from), redirect);
  const updatedAt = new Date().toISOString();
  await storage.setItem<RedirectManifest>(MANIFEST_KEY, {
    exact,
    dynamic,
    updatedAt
  });
  setDynamicRedirectRules(dynamic, updatedAt);
  await invalidateRedirectCache(redirect.from);
  await primeRedirectLookupCache(redirect.from);
  return redirect;
}

/**
 * Removes one redirect after consumer-specific webhook validation.
 * Pattern removals rebuild from registered sources because source order is the canonical pattern
 * precedence. The consumer must update its provider before invoking a pattern removal.
 * The affected public cache entries are invalidated after the storage mutation.
 *
 * @param origin - Provider-mapped redirect origin.
 */
export async function removeRedirect(origin: string): Promise<void> {
  const canonicalOrigin = toRedirectOrigin(origin);
  const storage = useRedirectStorage();
  const manifest = await getRedirectManifest();

  if (manifest.dynamic.some((rule) => rule.from === canonicalOrigin)) {
    await refreshRedirectStorage(await collectRedirectSourceResults());
    return;
  }

  await storage.removeItem(toRedirectStorageKey(canonicalOrigin));
  const exact = { ...manifest.exact };
  delete exact[canonicalOrigin];
  const dynamic = manifest.dynamic.filter((rule) => rule.from !== canonicalOrigin);
  const updatedAt = new Date().toISOString();
  await storage.setItem<RedirectManifest>(MANIFEST_KEY, {
    exact,
    dynamic,
    updatedAt
  });
  setDynamicRedirectRules(dynamic, updatedAt);
  await invalidateRedirectCache(canonicalOrigin);
}
