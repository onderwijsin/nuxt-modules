import { defineEventHandler, getRequestURL, proxyRequest } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";

import {
  type DirectusCredential,
  getDirectusAuthorizationHeader,
  resolveDirectusRequestContext
} from "../client/server/credentials";
import { assertDirectusEventSameOrigin } from "../auth/server/csrf";
import { resolveDirectusProxyUrl } from "./url";

const forwardedRequestHeaders = new Set([
  "accept",
  "accept-language",
  "cache-control",
  "content-type",
  "if-match",
  "if-none-match",
  "if-modified-since",
  "if-unmodified-since",
  "prefer",
  "range"
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

function isCorsHeader(header: string): boolean {
  return header.toLowerCase().startsWith("access-control-");
}

/**
 * Returns the REST request headers permitted across the proxy boundary.
 *
 * @returns Allowlisted request headers forwarded to Directus.
 */
export function getForwardedProxyHeaders(): string[] {
  return [...forwardedRequestHeaders];
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
 * Creates a fetch adapter that applies the proxy request and response header policies.
 *
 * @param credential Server-selected upstream credential.
 * @returns A sanitized Fetch-compatible adapter.
 */
export function createSanitizedProxyFetch(credential: DirectusCredential): typeof fetch {
  const directusFetch = ofetch.create({ responseType: "stream" });

  return async (input, init) => {
    const incomingHeaders = new Headers(init?.headers);
    const headers = new Headers();
    for (const [header, value] of incomingHeaders) {
      if (forwardedRequestHeaders.has(header.toLowerCase())) headers.set(header, value);
    }
    const authorization = getDirectusAuthorizationHeader(credential).authorization;
    if (authorization) headers.set("authorization", authorization);

    const request = input instanceof URL ? input.toString() : input;
    const response = await directusFetch.raw(request, {
      ...init,
      headers,
      ignoreResponseError: true
    });
    const safeHeaders = new Headers(response.headers);
    for (const header of [...safeHeaders.keys()]) {
      if (blockedResponseHeaders.has(header) || isCorsHeader(header)) safeHeaders.delete(header);
    }
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
    sessionAccessToken = (await event.context.directusAuth?.resolve())?.accessToken;
  }
  const { credential } = resolveDirectusRequestContext(event, {
    preview: config.public.directusClient.preview,
    proxyToken: config.directusClient.proxyToken,
    sessionAccessToken
  });
  if (requiresDirectusProxySameOrigin(credential)) {
    assertDirectusEventSameOrigin(event);
  }
  const targetUrl = new URL(target);
  targetUrl.searchParams.delete(config.public.directusClient.preview.queryKeys.token);

  return proxyRequest(event, targetUrl.toString(), {
    streamRequest: true,
    fetch: createSanitizedProxyFetch(credential)
  });
});
