import type { H3Event } from "h3";
import { getRequestHeader } from "h3";

/**
 * Checks whether a request contains the expected token in a dedicated header or bearer token.
 * @param event - H3 event carrying request headers.
 * @param token - Expected secret token.
 * @param headerName - Custom header name that may carry the token.
 * @returns Whether the request token matches the expected token.
 */
export function hasMatchingRequestToken(
  event: H3Event,
  token: string | undefined,
  headerName: string
): boolean {
  const normalizedToken = token?.trim();
  if (!normalizedToken) return false;

  const headerToken = getRequestHeader(event, headerName)?.trim();
  if (headerToken === normalizedToken) return true;

  const authorizationHeader = getRequestHeader(event, "authorization")?.trim();
  if (!authorizationHeader) return false;

  const [scheme, ...valueParts] = authorizationHeader.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer") return false;

  const bearerToken = valueParts.join(" ").trim();
  return bearerToken.length > 0 && bearerToken === normalizedToken;
}

/**
 * Checks whether a request carries a valid administrator token.
 * @param event - H3 event carrying request headers.
 * @param token - Configured administrator token.
 * @param headerName - Configured administrator header name.
 * @returns Whether the request is authenticated as an administrator.
 */
export function isAdmin(event: H3Event, token: string | undefined, headerName: string): boolean {
  return hasMatchingRequestToken(event, token, headerName);
}
