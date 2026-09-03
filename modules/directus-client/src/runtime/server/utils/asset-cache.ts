import {
  createBlobStorage,
  defineCachedHandler,
  type CachedEventHandler,
  type HTTPEvent
} from "ocache";
import type { H3Event } from "h3";
import type { ResolvedDirectusAssetCacheOptions } from "@onderwijsin/nuxt-directus-config/schema";
import { useStorage } from "nitropack/runtime/storage";

type AssetCacheConfig = Extract<ResolvedDirectusAssetCacheOptions, { enabled: true }>;
let cachedHandler: CachedEventHandler<HTTPEvent> | undefined;

/**
 * Parses directive names from a Cache-Control header, ignoring directive values.
 *
 * @param value Raw Cache-Control header value.
 * @returns Lowercase directive names.
 */
function getCacheControlDirectives(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((directive) => directive.trim().split("=", 1)[0]?.toLowerCase())
      .filter((directive): directive is string => Boolean(directive))
  );
}

/** Resolves a configured Nitro storage mount through Nitro's server-only storage runtime.
 * @param mount Nitro storage mount name.
 * @returns The configured Nitro storage mount.
 */
async function resolveAssetStorage(mount: string) {
  const rootStorage = useStorage();
  const resolvedMount = rootStorage.getMount(mount);
  if (!resolvedMount.base) {
    throw new Error(`Directus asset cache storage mount "${mount}" is not configured`);
  }
  return useStorage(mount);
}

/** Creates the one raw-byte ocache adapter for a configured Nitro storage mount.
 * @param mount Nitro storage mount name.
 * @returns An ocache storage interface backed by raw unstorage operations.
 */
export function createAssetCacheStorage(mount: string) {
  return createBlobStorage({
    get: async (key) => (await resolveAssetStorage(mount)).getItemRaw(key),
    set: async (key, value, options) => {
      const storage = await resolveAssetStorage(mount);
      if (value === null) return storage.removeItem(key);
      await storage.setItemRaw(key, value, { ttl: options?.ttl });
    }
  });
}

/** Lazily creates the anonymous-only cached Directus asset handler.
 * @param config Cache settings.
 * @param fetchAnonymous Anonymous-only resolver.
 * @returns The process-local cached handler.
 */
export function getAssetCacheHandler(
  config: AssetCacheConfig,
  fetchAnonymous: (event: HTTPEvent) => Promise<Response>
): CachedEventHandler<HTTPEvent> {
  cachedHandler ??= defineCachedHandler(fetchAnonymous, {
    name: "directus-assets",
    storage: () => createAssetCacheStorage(config.storage),
    maxAge: config.maxAge,
    maxBodySize: config.maxBodySize,
    swr: config.swr,
    staleMaxAge: config.staleMaxAge,
    varies: ["accept"],
    allowQuery: true,
    sendCacheControl: false,
    cacheStatusHeader: "x-directus-asset-cache",
    stream: true,
    shouldBypassCache: (event) =>
      event.req.headers.has("if-match") || event.req.headers.has("if-unmodified-since"),
    shouldCache: (entry) => {
      const directives = getCacheControlDirectives(entry.headers["cache-control"] ?? "");
      return (
        entry.status === 200 &&
        directives.has("public") &&
        !directives.has("private") &&
        !directives.has("no-store")
      );
    }
  });
  return cachedHandler;
}

/** Adapts the current H3 event to ocache's portable HTTP event shape.
 * @param event Current H3 event.
 * @param target Directus request URL.
 * @param headers Sanitized request headers.
 * @returns An ocache HTTP event.
 */
export function createAssetCacheEvent(event: H3Event, target: string, headers: Headers): HTTPEvent {
  const request = new Request(target, { method: event.method, headers });
  const serverRequest = Object.assign(request, { waitUntil: event.waitUntil.bind(event) });
  return { req: serverRequest, url: new URL(target) };
}
