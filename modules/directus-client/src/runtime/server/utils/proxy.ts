import { createError } from "h3";
import { attemptSync } from "@onderwijsin/nuxt-module-utils";
import { hasProtocol, isScriptProtocol, joinURL } from "ufo";

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

  const { data: base } = attemptSync(() => new URL(baseUrl));
  if (!base) {
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
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  if (target.origin !== base.origin || !target.pathname.startsWith(basePath)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid Directus proxy path" });
  }
  target.search = requestUrl.search;
  return target.toString();
}
