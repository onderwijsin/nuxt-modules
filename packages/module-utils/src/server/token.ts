import type { H3Event } from "h3";
import { getRequestHeader } from "h3";

/**
 * Checks whether a request token matches a configured header or bearer token.
 * @param event - The H3 request event.
 * @param token - The expected token.
 * @param headerName - The custom token header name.
 * @returns Whether the token matches.
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
 * @param event - The H3 request event.
 * @param token - The expected administrator token.
 * @param headerName - The custom token header name.
 * @returns Whether the token matches.
 */
export function isAdmin(event: H3Event, token: string | undefined, headerName: string): boolean {
  return hasMatchingRequestToken(event, token, headerName);
}
