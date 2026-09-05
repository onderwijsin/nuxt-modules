import {
  assertMethod,
  defineEventHandler,
  getRequestHeaders,
  getRequestURL,
  type H3Event
} from "h3";
import { useRuntimeConfig } from "#imports";
import type { ResolvedDirectusAssetCacheOptions } from "@onderwijsin/nuxt-directus-config/schema";
import { fetchDirectusAsset, getAssetRequestHeaders, type AssetRequestMethod } from "./transport";
import { resolveDirectusAssetUrl } from "./url";

interface AssetAuthenticationOptions {
  readonly authEnabled: boolean;
  readonly publicOnly: boolean;
}

type EnabledAssetCacheOptions = Extract<ResolvedDirectusAssetCacheOptions, { enabled: true }>;

/**
 * Returns whether Directus rejected the anonymous request for missing authorization.
 *
 * @param response Upstream Directus response.
 * @returns Whether the response is an authentication failure.
 */
function isAuthenticationFailure(response: Response): boolean {
  return response.status === 401 || response.status === 403;
}

/**
 * Adds the module's anonymous-first authentication fallback to one upstream response.
 *
 * Authentication is intentionally performed after the anonymous request and outside ocache. A
 * session token can therefore never become part of a shared cache resolver or cached response.
 *
 * @param event Incoming H3 event used for session resolution.
 * @param target Directus asset URL.
 * @param method Asset request method.
 * @param headers Sanitized request headers.
 * @param response Anonymous response.
 * @param options Authentication policy.
 * @returns The original or authenticated response.
 */
async function retryAssetWithFreshSession(
  event: H3Event,
  target: string,
  method: AssetRequestMethod,
  headers: Headers,
  response: Response,
  options: AssetAuthenticationOptions
): Promise<Response> {
  if (!isAuthenticationFailure(response) || options.publicOnly || !options.authEnabled)
    return response;

  const authState = await event.context.directusAuth?.resolve();
  if (!authState?.accessToken) return response;

  if (response.body) {
    try {
      await response.body.cancel();
    } catch {
      // Best-effort cleanup only; the authenticated retry remains authoritative.
    }
  }
  return fetchDirectusAsset(target, { method, headers, accessToken: authState.accessToken });
}

/**
 * Fetches anonymously once, then applies an optional session fallback outside the cache.
 *
 * @param event Incoming H3 event used for session resolution.
 * @param target Directus asset URL.
 * @param method Asset request method.
 * @param headers Sanitized request headers.
 * @param options Authentication policy.
 * @returns The anonymous or authenticated response.
 */
async function fetchAssetWithSessionFallback(
  event: H3Event,
  target: string,
  method: AssetRequestMethod,
  headers: Headers,
  options: AssetAuthenticationOptions
): Promise<Response> {
  const anonymousResponse = await fetchDirectusAsset(target, { method, headers });
  return retryAssetWithFreshSession(event, target, method, headers, anonymousResponse, options);
}

/**
 * Runs the anonymous-only resolver through ocache.
 *
 * The resolver receives only the cache event. It must not close over the H3 event or call session
 * helpers; this is the security boundary that prevents private assets from entering the cache.
 *
 * @param event Incoming H3 event used only to bridge `waitUntil`.
 * @param target Directus asset URL.
 * @param headers Sanitized request headers.
 * @param cache Enabled cache configuration.
 * @returns The anonymous cached response.
 */
async function fetchAssetWithCache(
  event: H3Event,
  target: string,
  headers: Headers,
  cache: EnabledAssetCacheOptions
): Promise<Response> {
  const { createAssetCacheEvent, getAssetCacheHandler } = await import("./cache.js");
  const cacheEvent = createAssetCacheEvent(event, target, headers);
  const response = await getAssetCacheHandler(cache, (cachedEvent) => {
    const method: AssetRequestMethod = cachedEvent.req.method === "HEAD" ? "HEAD" : "GET";
    return fetchDirectusAsset(cachedEvent.req.url, {
      method,
      headers: getAssetRequestHeaders(cachedEvent.req.headers),
      signal: cachedEvent.req.signal
    });
  })(cacheEvent);

  if (!(response instanceof Response)) {
    throw new Error("Directus asset cache returned an invalid response");
  }
  return response;
}

/** Proxies assets anonymously first; only 401/403 responses may escalate outside ocache.
 * @param event Incoming asset request event.
 * @returns The upstream or cached response.
 */
export default defineEventHandler(async (event) => {
  assertMethod(event, ["GET", "HEAD"]);
  const config = useRuntimeConfig(event);
  const method: AssetRequestMethod = event.method === "HEAD" ? "HEAD" : "GET";
  const assets = config.directusClient.assets;
  const authentication: AssetAuthenticationOptions = {
    authEnabled: config.directusClient.auth.enabled,
    publicOnly: assets.publicOnly
  };
  const target = resolveDirectusAssetUrl({
    baseUrl: config.directusClient.baseUrl,
    proxyPath: config.public.directusClient.assets.path,
    requestUrl: getRequestURL(event),
    assetUrl: config.directusClient.assets.url
  });
  const headers = getAssetRequestHeaders(getRequestHeaders(event));
  if (!assets.cache.enabled) {
    return fetchAssetWithSessionFallback(event, target, method, headers, authentication);
  }

  // Only the anonymous request is cached. Authentication is applied to the result below.
  const response = await fetchAssetWithCache(event, target, headers, assets.cache);
  return retryAssetWithFreshSession(event, target, method, headers, response, authentication);
});
