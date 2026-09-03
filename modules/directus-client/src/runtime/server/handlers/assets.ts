import {
  assertMethod,
  defineEventHandler,
  getRequestHeaders,
  getRequestURL,
  type H3Event
} from "h3";
import { useRuntimeConfig } from "#imports";
import { FetchError, ofetch } from "ofetch";
import { joinURL } from "ufo";
import { attempt, isArray, isDefined, toEntries } from "@onderwijsin/nuxt-module-utils/shared";
import { resolveDirectusProxyUrl } from "../utils/proxy";

const assetRequestHeaders = new Set([
  "accept",
  "range",
  "if-range",
  "if-match",
  "if-none-match",
  "if-modified-since",
  "if-unmodified-since"
]);
const blockedResponseHeaders = new Set([
  "set-cookie",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "proxy-connection"
]);

type AssetRequestMethod = "GET" | "HEAD";

interface AssetAuthenticationOptions {
  readonly authEnabled: boolean;
  readonly publicOnly: boolean;
}

interface EnabledAssetCacheOptions {
  readonly enabled: true;
  readonly storage: string;
  readonly maxAge: number;
  readonly swr: boolean;
  readonly staleMaxAge?: number;
}

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
 * Keeps only request headers that are meaningful for asset delivery.
 *
 * In particular, browser credentials and routing headers never cross this proxy boundary. The
 * conditional and range headers are retained because Directus and the browser use them for
 * validation, partial responses, and content negotiation.
 *
 * @param headers Incoming request headers.
 * @returns Sanitized asset headers.
 */
export function getAssetRequestHeaders(
  headers?: HeadersInit | Partial<Record<string, string | undefined>>
): Headers {
  const safeHeaders = new Headers();
  if (headers) {
    const entries =
      headers instanceof Headers || isArray(headers)
        ? new Headers(headers)
        : toEntries(headers).filter((entry): entry is [string, string] => isDefined(entry[1]));
    for (const [name, value] of entries)
      if (assetRequestHeaders.has(name.toLowerCase())) safeHeaders.set(name, value);
  }
  return safeHeaders;
}

/**
 * Resolves and validates a Directus asset URL while preserving its complete query string.
 *
 * Asset transformation parameters are intentionally not inspected or normalized here. The
 * upstream URL must remain identical to the browser's request so every Directus transformation
 * remains available to consumers.
 *
 * @param baseUrl Directus base URL.
 * @param proxyPath Local asset proxy path.
 * @param requestUrl Incoming request URL.
 * @returns Validated Directus asset URL.
 */
export function resolveDirectusAssetUrl(
  baseUrl: string,
  proxyPath: string,
  requestUrl: URL
): string {
  return resolveDirectusProxyUrl(joinURL(baseUrl, "assets"), proxyPath, requestUrl);
}

/**
 * Performs exactly one sanitized Directus asset request.
 *
 * This function deliberately has no authentication or retry behavior. Keeping one upstream
 * request here makes it safe to use as the resolver inside the anonymous-only cache.
 *
 * @param target Directus asset URL.
 * @param options Request method, headers, and optional bearer token.
 * @returns The sanitized upstream response.
 */
export async function fetchDirectusAsset(
  target: string,
  options: { method: AssetRequestMethod; headers: Headers; accessToken?: string }
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.accessToken) headers.set("authorization", "Bearer " + options.accessToken);

  const result = await attempt(() =>
    ofetch.raw(target, {
      responseType: "stream",
      method: options.method,
      headers,
      ignoreResponseError: false
    })
  );

  let response: Response;
  if (result.error || !result.data) {
    if (!(result.error instanceof FetchError) || !result.error.response) throw result.error;
    response = result.error.response;
  } else response = result.data;

  const safeHeaders = new Headers(response.headers);
  for (const header of blockedResponseHeaders) safeHeaders.delete(header);
  return new Response(response.body, {
    headers: safeHeaders,
    status: response.status,
    statusText: response.statusText
  });
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
async function resolveAssetAuthentication(
  event: H3Event,
  target: string,
  method: AssetRequestMethod,
  headers: Headers,
  response: Response,
  options: AssetAuthenticationOptions
): Promise<Response> {
  if (!isAuthenticationFailure(response) || options.publicOnly || !options.authEnabled)
    return response;

  const { ensureFreshDirectusSession } = await import("../utils/auth.js");
  const session = await ensureFreshDirectusSession(event);
  if (!session) return response;

  response.body?.cancel();
  return fetchDirectusAsset(target, { method, headers, accessToken: session.accessToken });
}

/**
 * Fetches anonymously once, then applies the optional session fallback outside the cache.
 *
 * @param event Incoming H3 event used for session resolution.
 * @param target Directus asset URL.
 * @param method Asset request method.
 * @param headers Sanitized request headers.
 * @param options Authentication policy.
 * @returns The anonymous or authenticated response.
 */
async function fetchAssetWithAuthentication(
  event: H3Event,
  target: string,
  method: AssetRequestMethod,
  headers: Headers,
  options: AssetAuthenticationOptions
): Promise<Response> {
  const anonymousResponse = await fetchDirectusAsset(target, { method, headers });
  return resolveAssetAuthentication(event, target, method, headers, anonymousResponse, options);
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
async function fetchCachedAnonymousAsset(
  event: H3Event,
  target: string,
  headers: Headers,
  cache: EnabledAssetCacheOptions
): Promise<Response> {
  const { createAssetCacheEvent, getAssetCacheHandler } = await import("../utils/asset-cache.js");
  const cacheEvent = createAssetCacheEvent(event, target, headers);
  const response = await getAssetCacheHandler(cache, (cachedEvent) => {
    const method: AssetRequestMethod = cachedEvent.req.method === "HEAD" ? "HEAD" : "GET";
    return fetchDirectusAsset(cachedEvent.req.url, {
      method,
      headers: getAssetRequestHeaders(cachedEvent.req.headers)
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
  const target = resolveDirectusAssetUrl(
    config.directusClient.baseUrl,
    config.public.directusClient.assets.path,
    getRequestURL(event)
  );
  const headers = getAssetRequestHeaders(getRequestHeaders(event));
  if (!assets.cache.enabled) {
    return fetchAssetWithAuthentication(event, target, method, headers, authentication);
  }

  // Only the anonymous request is cached. Authentication is applied to the result below.
  const response = await fetchCachedAnonymousAsset(event, target, headers, assets.cache);
  return resolveAssetAuthentication(event, target, method, headers, response, authentication);
});
