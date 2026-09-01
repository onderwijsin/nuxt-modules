import {
  assertMethod,
  defineEventHandler,
  getRequestHeaders,
  getRequestURL,
  sendProxy,
  type H3Event
} from "h3";
import { useRuntimeConfig } from "#imports";
import { FetchError, ofetch } from "ofetch";
import { joinURL } from "ufo";

import { resolveDirectusProxyUrl } from "../utils/proxy";
import { attempt, isArray, isDefined, toEntries } from "@onderwijsin/nuxt-module-utils/shared";

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

/**
 * Filters request headers to those safe and useful for Directus asset delivery.
 *
 * @param headers Incoming request headers.
 * @returns A new header collection containing only permitted asset headers.
 */
function getAssetRequestHeaders(
  headers?: HeadersInit | Partial<Record<string, string | undefined>>
): Headers {
  const safeHeaders = new Headers();
  if (headers) {
    const entries =
      headers instanceof Headers || isArray(headers)
        ? new Headers(headers)
        : toEntries(headers).filter((entry): entry is [string, string] => isDefined(entry[1]));
    for (const [name, value] of entries) {
      if (assetRequestHeaders.has(name.toLowerCase())) safeHeaders.set(name, value);
    }
  }
  return safeHeaders;
}

/**
 * Resolves an asset request below the controlled Directus `/assets` upstream prefix.
 *
 * @param baseUrl Configured Directus URL.
 * @param proxyPath Configured local asset proxy path.
 * @param requestUrl Incoming request URL.
 * @returns A validated Directus asset URL with its query string preserved.
 */
export function resolveDirectusAssetUrl(
  baseUrl: string,
  proxyPath: string,
  requestUrl: URL
): string {
  return resolveDirectusProxyUrl(joinURL(baseUrl, "assets"), proxyPath, requestUrl);
}

/**
 * Creates the asset Fetch adapter used by `sendProxy`.
 *
 * The single retry is authentication escalation: an anonymous 401/403 may lazily resolve the
 * current session and retry once with its access token. It is not generic request resilience.
 *
 * @param event Incoming Nitro request event.
 * @param options Asset authentication policy.
 * @returns A Fetch-compatible adapter with sanitized request and response headers.
 */
export function createDirectusAssetFetch(
  event: H3Event,
  options: { authEnabled: boolean; publicOnly: boolean }
): typeof fetch {
  const directusFetch = ofetch.create({
    responseType: "stream",
    retry: options.publicOnly || !options.authEnabled ? 0 : 1,
    retryStatusCodes: [401, 403],
    onResponseError: async ({ response, options: fetchOptions }) => {
      if (
        options.publicOnly ||
        !options.authEnabled ||
        fetchOptions.retry !== 1 ||
        ![401, 403].includes(response.status)
      ) {
        return;
      }

      const { ensureFreshDirectusSession } = await import("../utils/auth.js");
      const session = await ensureFreshDirectusSession(event);
      if (!session) {
        fetchOptions.retry = 0;
        return;
      }

      await response.body?.cancel();
      const headers = getAssetRequestHeaders(fetchOptions.headers);
      headers.set("authorization", "Bearer " + session.accessToken);
      fetchOptions.headers = headers;
    }
  });

  return async (input, init) => {
    const request = input instanceof URL ? input.toString() : input;
    let response: Response;
    const { data, error } = await attempt(() =>
      directusFetch.raw(request, {
        ...init,
        // sendProxy sets this to true, but the adapter must let ofetch run its response-error hook.
        ignoreResponseError: false,
        headers: getAssetRequestHeaders(init?.headers)
      })
    );

    if (error || !data) {
      if (!(error instanceof FetchError) || !error.response) throw error;
      response = error.response;
    } else {
      response = data;
    }

    const safeHeaders = new Headers(response.headers);
    for (const header of blockedResponseHeaders) safeHeaders.delete(header);
    return new Response(response.body, {
      headers: safeHeaders,
      status: response.status,
      statusText: response.statusText
    });
  };
}

/**
 * Proxies a Directus asset request with anonymous-first authentication escalation.
 *
 * @param event Incoming Nitro request event.
 * @returns The response relayed from Directus.
 */
export default defineEventHandler(async function directusAssetHandler(event) {
  assertMethod(event, ["GET", "HEAD"]);
  const config = useRuntimeConfig(event);
  const target = resolveDirectusAssetUrl(
    config.directusClient.baseUrl,
    config.public.directusClient.assets.path,
    getRequestURL(event)
  );
  const requestHeaders = getAssetRequestHeaders(getRequestHeaders(event));

  return sendProxy(event, target, {
    fetch: createDirectusAssetFetch(event, {
      authEnabled: config.directusClient.auth.enabled,
      publicOnly: config.public.directusClient.assets.publicOnly
    }),
    fetchOptions: {
      method: event.method,
      headers: requestHeaders
    }
  });
});
