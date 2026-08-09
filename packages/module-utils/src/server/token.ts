import type { H3Event } from "h3";
import { createError, getRequestHeader } from "h3";

/** Configuration shared by server endpoints that use administrator authentication. */
export interface AdminAuthOptions {
  adminToken?: string;
  adminHeaderName: string;
  devAuthBypass: boolean;
}

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

/**
 * Returns whether administrator authentication may be bypassed for this request.
 * @param isDevelopment - Whether the current runtime is a development build.
 * @param devAuthBypass - Whether the consumer explicitly enabled the bypass.
 * @returns Whether authentication may be bypassed.
 */
export function isDevelopmentAuthBypassEnabled(
  isDevelopment: boolean,
  devAuthBypass: boolean
): boolean {
  return isDevelopment && devAuthBypass;
}

/**
 * Requires a request to carry the configured administrator token.
 * @param event - Current H3 request event.
 * @param options - Administrator authentication configuration.
 * @param isDevelopment - Whether the current runtime is a development build.
 * @returns Nothing when the request is authorized.
 */
export function assertAdminAccess(
  event: H3Event,
  options: AdminAuthOptions,
  isDevelopment: boolean
): void {
  if (
    isDevelopmentAuthBypassEnabled(isDevelopment, options.devAuthBypass) ||
    isAdmin(event, options.adminToken, options.adminHeaderName)
  ) {
    return;
  }

  throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
}
