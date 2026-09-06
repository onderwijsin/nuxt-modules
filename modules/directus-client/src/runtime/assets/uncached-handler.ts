import {
  assertMethod,
  defineEventHandler,
  getRequestHeaders,
  getRequestURL,
  sendProxy,
  type H3Event
} from "h3";
import { useRuntimeConfig } from "#imports";
import { fetchDirectusAsset, getAssetRequestHeaders, type AssetRequestMethod } from "./transport";
import {
  applyPrivateAssetCachePolicy,
  retryAssetWithFreshSession,
  type AssetAuthenticationOptions
} from "./authentication";
import { resolveDirectusAssetUrl } from "./url";

/** Creates the Fetch adapter used by H3's streaming proxy.
 * @param event Incoming request event.
 * @param options Authentication policy.
 * @returns A Fetch-compatible streaming adapter.
 */
export function createDirectusAssetFetch(
  event: H3Event,
  options: AssetAuthenticationOptions
): typeof fetch {
  return async (input, init) => {
    const target =
      input instanceof Request ? input.url : input instanceof URL ? input.toString() : input;
    const method: AssetRequestMethod = init?.method === "HEAD" ? "HEAD" : "GET";
    const headers = getAssetRequestHeaders(init?.headers);
    const anonymous = await fetchDirectusAsset(target, {
      method,
      headers,
      ...(init?.signal ? { signal: init.signal } : {})
    });
    const result = await retryAssetWithFreshSession(
      event,
      target,
      method,
      headers,
      anonymous,
      options
    );
    return result.authenticated ? applyPrivateAssetCachePolicy(result.response) : result.response;
  };
}

/** Proxies uncached assets with H3 streaming and anonymous-first authentication.
 * @param event Incoming request event.
 * @returns The proxied response.
 */
export default defineEventHandler(async (event) => {
  assertMethod(event, ["GET", "HEAD"]);
  const config = useRuntimeConfig(event);
  const target = resolveDirectusAssetUrl({
    baseUrl: config.directusClient.baseUrl,
    proxyPath: config.public.directusClient.assets.path,
    requestUrl: getRequestURL(event),
    assetUrl: config.directusClient.assets.url
  });
  return sendProxy(event, target, {
    fetch: createDirectusAssetFetch(event, {
      authEnabled: config.directusClient.auth.enabled,
      publicOnly: config.directusClient.assets.publicOnly
    }),
    fetchOptions: {
      method: event.method,
      headers: getAssetRequestHeaders(getRequestHeaders(event))
    }
  });
});
