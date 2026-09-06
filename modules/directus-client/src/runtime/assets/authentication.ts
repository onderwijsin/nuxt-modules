import type { H3Event } from "h3";
import { fetchDirectusAsset, type AssetRequestMethod } from "./transport";

export interface AssetAuthenticationOptions {
  readonly authEnabled: boolean;
  readonly publicOnly: boolean;
}

/** Applies the request-scoped session fallback to an anonymous asset response.
 * @param event Incoming request event.
 * @param target Directus asset URL.
 * @param method Asset request method.
 * @param headers Sanitized request headers.
 * @param response Anonymous response.
 * @param options Authentication policy.
 * @returns The response and whether session authentication was used.
 */
export async function retryAssetWithFreshSession(
  event: H3Event,
  target: string,
  method: AssetRequestMethod,
  headers: Headers,
  response: Response,
  options: AssetAuthenticationOptions
): Promise<{ response: Response; authenticated: boolean }> {
  if (![401, 403].includes(response.status) || options.publicOnly || !options.authEnabled) {
    return { response, authenticated: false };
  }

  const authState = await event.context.directusAuth?.resolve();
  if (!authState?.accessToken) return { response, authenticated: false };
  if (response.body) await response.body.cancel().catch(() => undefined);

  return {
    response: await fetchDirectusAsset(target, {
      method,
      headers,
      accessToken: authState.accessToken
    }),
    authenticated: true
  };
}

/** Marks a session-backed response as private to prevent downstream shared caching.
 * @param response Session-backed asset response.
 * @returns Response with a private no-store policy.
 */
export function applyPrivateAssetCachePolicy(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "private, no-store");
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText
  });
}
