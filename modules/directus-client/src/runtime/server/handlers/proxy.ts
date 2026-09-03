import { defineEventHandler, getRequestURL, proxyRequest } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";

import {
  type DirectusCredential,
  getDirectusAuthorizationHeader,
  resolveDirectusRequestContext
} from "../utils/credentials";
import { assertDirectusEventSameOrigin } from "../utils/csrf";
import { resolveDirectusProxyUrl } from "../utils/proxy";

const blockedRequestHeaders = new Set([
  "authorization",
  "cookie",
  "host",
  "origin",
  "content-length",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
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
  "upgrade"
]);

/**
 * Returns request headers that are removed before forwarding to Directus.
 *
 * @returns Credential and routing headers that must not cross the proxy boundary.
 */
export function getForwardedProxyHeaders(): string[] {
  return [...blockedRequestHeaders];
}

/**
 * Returns whether a proxy request using the selected credential must prove same-origin intent.
 *
 * @param credential Server-selected Directus credential.
 * @returns Whether state-changing requests require Origin or Referer validation.
 */
export function requiresDirectusProxySameOrigin(credential: DirectusCredential): boolean {
  return credential.accessToken !== undefined;
}

/**
 * Creates a fetch adapter that removes caller credentials before proxying.
 *
 * @param credential Server-selected upstream credential.
 * @returns A sanitized Fetch-compatible adapter.
 */
export function createSanitizedProxyFetch(credential: DirectusCredential): typeof fetch {
  const directusFetch = ofetch.create({ responseType: "stream" });

  return async (input, init) => {
    const headers = new Headers(init?.headers);
    for (const header of blockedRequestHeaders) headers.delete(header);
    const authorization = getDirectusAuthorizationHeader(credential).authorization;
    if (authorization) headers.set("authorization", authorization);

    const request = input instanceof URL ? input.toString() : input;
    const response = await directusFetch.raw(request, { ...init, headers });
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
 * Forwards browser REST traffic to Directus using only server-selected credentials.
 *
 * @param event Incoming Nitro request event.
 * @returns The upstream response body and status as handled by H3.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const requestUrl = getRequestURL(event);
  const target = resolveDirectusProxyUrl(
    config.directusClient.baseUrl,
    config.public.directusClient.proxy.path,
    requestUrl
  );
  let sessionAccessToken: string | undefined;
  if (config.directusClient.auth.enabled) {
    const { ensureFreshDirectusSession } = await import("../utils/auth");
    sessionAccessToken = (await ensureFreshDirectusSession(event))?.accessToken;
  }
  const { credential } = resolveDirectusRequestContext(event, {
    preview: config.public.directusClient.preview,
    staticToken: config.directusClient.staticToken,
    sessionAccessToken
  });
  if (requiresDirectusProxySameOrigin(credential)) {
    assertDirectusEventSameOrigin(event);
  }
  const targetUrl = new URL(target);
  targetUrl.searchParams.delete(config.public.directusClient.preview.queryKeys.token);

  return proxyRequest(event, targetUrl.toString(), {
    streamRequest: true,
    fetch: createSanitizedProxyFetch(credential),
    fetchOptions: {
      headers: getDirectusAuthorizationHeader(credential)
    }
  });
});
