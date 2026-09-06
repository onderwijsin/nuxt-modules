import type { H3Event } from "h3";
import { fetchDirectusAsset, type AssetRequestMethod } from "./transport";

export interface AssetAuthenticationOptions {
  readonly authEnabled: boolean;
  readonly publicOnly: boolean;
}

/**
 * Resolves an anonymous asset response with the request-scoped session fallback when required.
 *
 * @param event Incoming request event.
 * @param target Directus asset URL.
 * @param method Asset request method.
 * @param headers Sanitized request headers.
 * @param response Anonymous response.
 * @param options Authentication policy.
 * @returns The final safe asset response.
 */
export async function resolveAssetWithSessionFallback(
  event: H3Event,
  target: string,
  method: AssetRequestMethod,
  headers: Headers,
  response: Response,
  options: AssetAuthenticationOptions
): Promise<Response> {
  if (![401, 403].includes(response.status) || options.publicOnly || !options.authEnabled) {
    return response;
  }

  const authState = await event.context.directusAuth?.resolve();
  if (!authState?.accessToken) return response;
  if (response.body) await response.body.cancel().catch(() => undefined);

  const authenticatedResponse = await fetchDirectusAsset(target, {
    method,
    headers,
    accessToken: authState.accessToken
  });
  const safeHeaders = new Headers(authenticatedResponse.headers);
  safeHeaders.set("cache-control", "private, no-store");
  return new Response(authenticatedResponse.body, {
    headers: safeHeaders,
    status: authenticatedResponse.status,
    statusText: authenticatedResponse.statusText
  });
}
