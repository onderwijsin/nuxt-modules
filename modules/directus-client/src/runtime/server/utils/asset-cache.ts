import {
  createBlobStorage,
  defineCachedHandler,
  type CachedEventHandler,
  type HTTPEvent
} from "ocache";
import { useStorage } from "nitropack/runtime";
import type { H3Event } from "h3";

interface AssetCacheConfig {
  readonly storage: string;
  readonly maxAge: number;
  readonly swr: boolean;
  readonly staleMaxAge?: number;
}
let cachedHandler: CachedEventHandler<HTTPEvent> | undefined;

/** Creates the one raw-byte ocache adapter for a configured Nitro storage mount.
 * @param mount Nitro storage mount name.
 * @returns An ocache storage interface backed by raw unstorage operations.
 */
function createAssetCacheStorage(mount: string) {
  const storage = useStorage(mount);
  return createBlobStorage({
    get: (key) => storage.getItemRaw(key),
    set: async (key, value, options) => {
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
    swr: config.swr,
    staleMaxAge: config.staleMaxAge,
    varies: ["accept"],
    allowQuery: true,
    sendCacheControl: false,
    cacheStatusHeader: "x-directus-asset-cache",
    shouldCache: (entry) => {
      const cacheControl = entry.headers["cache-control"]?.toLowerCase() ?? "";
      return (
        entry.status === 200 &&
        cacheControl.includes("public") &&
        !cacheControl.includes("private") &&
        !cacheControl.includes("no-store")
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
