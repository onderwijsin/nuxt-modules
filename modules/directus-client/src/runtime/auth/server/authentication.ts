import type { H3Event } from "h3";
import { createError } from "h3";
import { attemptSync, isBoolean, isRecord } from "@onderwijsin/nuxt-module-utils/shared";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

import { setDirectusSession, type DirectusSession, type DirectusSessionSnapshot } from "./session";
import { getDirectusRuntimeConfig } from "../../core/runtime-config";

const currentUserFields = ["id", "email", "first_name", "last_name"] as const;

const directusTokenResponseSchema = z.object({
  data: z.object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
    expires: z.number().int().positive().optional()
  })
});
const directusCurrentUserResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    email: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional()
  })
});

export interface DirectusAuthenticationResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expires?: number;
}

/**
 * Validates and maps a Directus authentication response for session establishment.
 *
 * @param response - Untrusted response returned by a Directus authentication endpoint.
 * @returns The validated authentication result required by the server session layer.
 */
export function parseDirectusAuthenticationResponse(
  response: unknown
): DirectusAuthenticationResult {
  const tokens = directusTokenResponseSchema.parse(response).data;
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expires: tokens.expires
  };
}

/**
 * Decodes a Directus access-token JWT and reads its TFA setup requirement claim.
 *
 * This is informational state only. The token is not cryptographically verified here because
 * Directus has already issued it, and this value must not be used as an authorization decision.
 *
 * @param accessToken - Directus access token whose payload should be inspected.
 * @returns Whether the token contains `enforce_tfa: true`; malformed tokens return `false`.
 */
export function decodeDirectusTfaSetupRequirement(accessToken: string): boolean {
  const payload = accessToken.split(".")[1];
  if (!payload) return false;
  const encoded = payload
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(payload.length / 4) * 4, "=");
  const decoded = attemptSync(() => atob(encoded));
  if (decoded.error !== null || decoded.data === null) return false;
  const parsed = attemptSync(() => JSON.parse(decoded.data));
  if (parsed.error !== null || parsed.data === null || !isRecord(parsed.data)) return false;
  return isBoolean(parsed.data.enforce_tfa) && parsed.data.enforce_tfa;
}

/**
 * Builds a Directus endpoint from the private runtime base URL.
 *
 * @param event - Incoming request event.
 * @param path - Directus-relative endpoint path.
 * @returns An upstream Directus URL.
 */
export function getDirectusEndpoint(event: H3Event, path: string): string {
  const baseUrl = getDirectusRuntimeConfig(event).directusClient.baseUrl;
  if (!baseUrl) {
    throw createError({ statusCode: 503, statusMessage: "Directus is not configured" });
  }
  return joinURL(baseUrl, path);
}

/**
 * Fetches the selected current-user fields with a one-request access token.
 *
 * Keep this field list synchronized with DirectusSessionSnapshot. Add a field here before adding
 * it to the snapshot so the cookie remains intentionally compact.
 *
 * @param event - Incoming request event.
 * @param accessToken - Request-scoped Directus access token.
 * @returns The validated session snapshot derived from the current-user payload.
 */
export async function fetchDirectusCurrentUser(
  event: H3Event,
  accessToken: string
): Promise<DirectusSessionSnapshot> {
  const response = await ofetch<unknown>(getDirectusEndpoint(event, "users/me"), {
    headers: { authorization: "Bearer " + accessToken },
    query: { fields: currentUserFields.join(",") }
  });
  const { id, email, first_name, last_name } =
    directusCurrentUserResponseSchema.parse(response).data;
  return {
    userId: id,
    email: email ?? null,
    firstName: first_name ?? null,
    lastName: last_name ?? null,
    requiresTfaSetup: false
  };
}

/**
 * Builds a server-only Directus session from a validated authentication result.
 *
 * The returned session includes the access and refresh tokens for server-side use and a safe,
 * token-free snapshot. This helper constructs the server-only session without persisting it.
 *
 * @param event - Incoming request event.
 * @param authentication - Validated Directus access and refresh tokens.
 * @returns The server-only session payload.
 */
async function createDirectusSessionFromAuthentication(
  event: H3Event,
  authentication: DirectusAuthenticationResult
): Promise<DirectusSession> {
  const now = Date.now();
  return {
    accessToken: authentication.accessToken,
    refreshToken: authentication.refreshToken,
    expiresAt: now + (authentication.expires ?? 900_000),
    snapshot: {
      ...(await fetchDirectusCurrentUser(event, authentication.accessToken)),
      requiresTfaSetup: decodeDirectusTfaSetupRequirement(authentication.accessToken)
    }
  };
}

/**
 * Establishes the server-owned session from a validated Directus authentication result.
 *
 * @param event - Incoming request event.
 * @param authentication - Validated Directus access and refresh tokens.
 * @returns The server-only session payload.
 */
export async function establishDirectusSession(
  event: H3Event,
  authentication: DirectusAuthenticationResult
): Promise<DirectusSession> {
  const session = await createDirectusSessionFromAuthentication(event, authentication);
  await setDirectusSession(event, session);
  return session;
}

/**
 * Creates a session after validating Directus login credentials and the access token.
 *
 * @param event - Incoming request event.
 * @param input - Validated login credentials and optional OTP.
 * @returns The server-only session payload.
 */
export async function createDirectusSession(
  event: H3Event,
  input: { readonly email: string; readonly password: string; readonly otp?: string }
): Promise<DirectusSession> {
  const response = await ofetch<unknown>(getDirectusEndpoint(event, "auth/login"), {
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
      ...(input.otp ? { otp: input.otp } : {}),
      mode: "json"
    }
  });
  return establishDirectusSession(event, parseDirectusAuthenticationResponse(response));
}
