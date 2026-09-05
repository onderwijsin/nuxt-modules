import { defineEventHandler, getRequestURL, proxyRequest } from "h3";
import { useRuntimeConfig } from "#imports";
import {
  type DirectusCredential,
  resolveDirectusRequestContext
} from "../client/server/request-context";
import { assertDirectusEventSameOrigin } from "../auth/server/csrf";
import { createSanitizedProxyFetch } from "./transport";
import { resolveDirectusProxyUrl } from "./url";

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
