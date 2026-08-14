import type { Nuxt } from "@nuxt/schema";

type DirectusSetupCache = Map<string | symbol, Promise<unknown>>;

const caches = new WeakMap<Nuxt, DirectusSetupCache>();
const cleanupRegistered = new WeakSet<Nuxt>();
const handlerIdentities = new WeakMap<Function, string>();
let nextHandlerIdentity = 0;

/**
 * Returns a stable process-local identity for a setup handler.
 *
 * @param handler Setup handler whose identity should be reused.
 * @returns A stable identity for the handler reference.
 */
export function getDirectusSetupHandlerId(handler: Function): string {
  const existing = handlerIdentities.get(handler);
  if (existing) return existing;

  nextHandlerIdentity += 1;
  const identity = `directus-setup-handler:${nextHandlerIdentity}`;
  handlerIdentities.set(handler, identity);
  return identity;
}

/**
 * Returns the Directus setup cache for a Nuxt instance.
 *
 * The cache is build-time state and is intentionally kept outside Nuxt options so it cannot be
 * serialized into consumer configuration or generated runtime output.
 *
 * @param nuxt Nuxt instance owning the setup lifecycle.
 * @returns The shared cache for the Nuxt instance.
 */
export function useDirectusSetupCache(nuxt: Nuxt): DirectusSetupCache {
  let cache = caches.get(nuxt);

  if (!cache) {
    cache = new Map();
    caches.set(nuxt, cache);
  }

  if (!cleanupRegistered.has(nuxt)) {
    cleanupRegistered.add(nuxt);
    const cleanup = () => {
      if (!caches.has(nuxt)) return;
      console.info(
        `🧹 Clearing Directus setup cache (${cache.size} entr${cache.size === 1 ? "y" : "ies"}).`
      );
      cache.clear();
      caches.delete(nuxt);
      cleanupRegistered.delete(nuxt);
    };

    // Setup data is no longer needed after every Nuxt module has initialized. The close hook is
    // retained as a fallback for consumers that create the cache outside the normal module flow.
    nuxt.hook("modules:done", cleanup);
    nuxt.hook("close", cleanup);
  }

  return cache;
}

/**
 * Resolves a setup operation once for a cache identity shared by Directus modules.
 *
 * Rejected operations are removed so failures are never retained. The promise is cached before
 * awaiting it, which also coalesces concurrent requests for the same setup operation.
 *
 * @param nuxt Nuxt instance owning the setup lifecycle.
 * @param identity String or symbol identity for the operation, normally derived from its fetch
 * config. Handler identities are strings, while symbols remain supported for callers that need
 * object-local cache keys.
 * @param handler Operation to execute when no cached result exists.
 * @returns The successful operation result.
 */
export async function withDirectusSetupCache<T>(
  nuxt: Nuxt,
  identity: string | symbol,
  handler: () => T | Promise<T>
): Promise<T> {
  const cache = useDirectusSetupCache(nuxt);
  const cached = cache.get(identity);

  if (cached) return (await cached) as T;

  const result = Promise.resolve().then(handler);
  cache.set(identity, result);

  try {
    return (await result) as T;
  } catch (error) {
    cache.delete(identity);
    throw error;
  }
}
