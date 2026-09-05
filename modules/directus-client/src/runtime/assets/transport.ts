import { createError } from "h3";
import { ofetch } from "ofetch";
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
  "content-encoding",
  "content-length",
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

/** Asset methods supported by the Directus asset boundary. */
export type AssetRequestMethod = "GET" | "HEAD";

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
  options: {
    method: AssetRequestMethod;
    headers: Headers;
    accessToken?: string;
    signal?: AbortSignal;
  }
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.accessToken) headers.set("authorization", "Bearer " + options.accessToken);

  const { data: response, error } = await attempt(() =>
    ofetch.raw(target, {
      responseType: "stream",
      method: options.method,
      headers,
      ignoreResponseError: true,
      signal: options.signal
    })
  );
  if (error !== null || response === null) {
    throw createError({
      statusCode: 502,
      statusMessage: "Bad Gateway",
      cause: error ?? new Error("Directus returned no asset response")
    });
  }

  const safeHeaders = new Headers(response.headers);
  for (const header of blockedResponseHeaders) safeHeaders.delete(header);
  safeHeaders.set("vary", "Accept");
  return new Response(response.body, {
    headers: safeHeaders,
    status: response.status,
    statusText: response.statusText
  });
}
