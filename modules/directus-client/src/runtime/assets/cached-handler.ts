import { assertMethod, defineEventHandler, getRequestHeaders, getRequestURL } from "h3";
import { useRuntimeConfig } from "#imports";
import { getAssetCacheHandler, createAssetCacheEvent } from "./cache";
import {
  applyPrivateAssetCachePolicy,
  retryAssetWithFreshSession,
  type AssetAuthenticationOptions
} from "./authentication";
import { fetchDirectusAsset, getAssetRequestHeaders, type AssetRequestMethod } from "./transport";
import { resolveDirectusAssetUrl } from "./url";

/** Proxies an asset through the anonymous-only cache and applies auth outside it.
 * @param event Incoming request event.
 * @returns The cached or session-backed response.
 */
export default defineEventHandler(async (event) => {
  assertMethod(event, ["GET", "HEAD"]);
  const config = useRuntimeConfig(event);
  const method: AssetRequestMethod = event.method === "HEAD" ? "HEAD" : "GET";
  const headers = getAssetRequestHeaders(getRequestHeaders(event));
  const target = resolveDirectusAssetUrl({
    baseUrl: config.directusClient.baseUrl,
    proxyPath: config.public.directusClient.assets.path,
    requestUrl: getRequestURL(event),
    assetUrl: config.directusClient.assets.url
  });
  const cache = config.directusClient.assets.cache;
  if (cache.enabled !== true) throw new Error("Directus asset cache is not enabled");
  const cachedResponse = await getAssetCacheHandler(cache, (cachedEvent) =>
    fetchDirectusAsset(cachedEvent.req.url, {
      method: cachedEvent.req.method === "HEAD" ? "HEAD" : "GET",
      headers: getAssetRequestHeaders(cachedEvent.req.headers),
      signal: cachedEvent.req.signal
    })
  )(createAssetCacheEvent(event, target, headers));
  if (!(cachedResponse instanceof Response)) {
    throw new Error("Directus asset cache returned an invalid response");
  }
  const authentication: AssetAuthenticationOptions = {
    authEnabled: config.directusClient.auth.enabled,
    publicOnly: config.directusClient.assets.publicOnly
  };
  const result = await retryAssetWithFreshSession(
    event,
    target,
    method,
    headers,
    cachedResponse,
    authentication
  );
  return result.authenticated ? applyPrivateAssetCachePolicy(result.response) : result.response;
});
