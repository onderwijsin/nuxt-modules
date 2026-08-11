import { createError, defineEventHandler, getRequestURL, proxyRequest } from "h3";
import { useRuntimeConfig } from "#imports";
import { attemptSync } from "@onderwijsin/nuxt-module-utils";
import { ofetch } from "ofetch";
import { hasProtocol, isScriptProtocol, joinURL } from "ufo";

import {
  type DirectusCredential,
  getDirectusAuthorizationHeader,
  resolveDirectusRequestContext
} from "../utils/credentials";
import { assertDirectusEventSameOrigin } from "../utils/csrf";

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
 * Resolves a proxy request into a Directus URL while preserving the request query string.
 *
 * @param baseUrl Configured Directus URL.
 * @param proxyPath Configured same-origin proxy prefix.
 * @param requestUrl Incoming request URL.
 * @returns A validated upstream URL.
 */
export function resolveDirectusProxyUrl(
  baseUrl: string,
  proxyPath: string,
  requestUrl: URL
): string {
  const pathname = requestUrl.pathname;
  if (pathname !== proxyPath && !pathname.startsWith(`${proxyPath}/`)) {
    throw createError({ statusCode: 404, statusMessage: "Invalid Directus proxy path" });
  }

  const suffix = pathname.slice(proxyPath.length) || "/";
  const { data: decodedSuffix } = attemptSync(() => decodeURIComponent(suffix));
  if (!decodedSuffix) {
    throw createError({ statusCode: 400, statusMessage: "Malformed Directus proxy path" });
  }

  if (
    decodedSuffix.includes("\0") ||
    decodedSuffix.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw createError({ statusCode: 400, statusMessage: "Invalid Directus proxy path" });
  }

  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    throw createError({ statusCode: 500, statusMessage: "Directus baseUrl must use HTTP(S)" });
  }
  if (
    !hasProtocol(baseUrl, { strict: true }) ||
    isScriptProtocol(base.protocol) ||
    (base.protocol !== "http:" && base.protocol !== "https:")
  ) {
    throw createError({ statusCode: 500, statusMessage: "Directus baseUrl must use HTTP(S)" });
  }

  const target = new URL(joinURL(baseUrl, decodedSuffix));
  target.search = requestUrl.search;
  return target.toString();
}

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
    config.directus.baseUrl,
    config.public.directus.proxy.path,
    requestUrl
  );
  let sessionAccessToken: string | undefined;
  if (config.directus.auth.enabled) {
    console.log("Ensuring fresh Directus session");
    const { ensureFreshDirectusSession } = await import("../utils/auth.js");
    sessionAccessToken = (await ensureFreshDirectusSession(event))?.accessToken;
  }
  const { credential } = resolveDirectusRequestContext(event, {
    preview: config.public.directus.preview,
    staticToken: config.directus.staticToken,
    sessionAccessToken
  });
  if (requiresDirectusProxySameOrigin(credential)) {
    assertDirectusEventSameOrigin(event);
  }
  const targetUrl = new URL(target);
  targetUrl.searchParams.delete(config.public.directus.preview.queryKeys.token);

  return proxyRequest(event, targetUrl.toString(), {
    streamRequest: true,
    fetch: createSanitizedProxyFetch(credential),
    fetchOptions: {
      headers: getDirectusAuthorizationHeader(credential)
    }
  });
});
