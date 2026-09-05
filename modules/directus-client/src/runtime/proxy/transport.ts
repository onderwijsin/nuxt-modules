import { ofetch } from "ofetch";

import {
  type DirectusCredential,
  getDirectusAuthorizationHeader
} from "../client/server/request-context";

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
