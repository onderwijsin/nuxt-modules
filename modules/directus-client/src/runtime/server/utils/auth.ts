import type { H3Event } from "h3";
import { createError, setResponseStatus } from "h3";
import {
  attempt,
  attemptSync,
  isBoolean,
  isArray,
  isDefined,
  isInteger,
  isRecord,
  isString
} from "@onderwijsin/nuxt-module-utils/shared";
import { hash } from "ohash";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";
import { useStorage } from "nitropack/runtime";

import {
  clearDirectusSession,
  getDirectusSession,
  getDirectusSessionDetails,
  sealDirectusSession,
  setDirectusSession,
  type DirectusSession,
  type DirectusSessionSnapshot,
  writeDirectusSessionCookie
} from "./session";
import { getDirectusRuntimeConfig } from "./runtime-config";

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
function decodeDirectusTfaSetupRequirement(accessToken: string): boolean {
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

interface PendingRefreshFlight {
  readonly status: "pending";
  readonly owner: string;
  readonly startedAt: number;
}

interface CompletedRefreshFlight {
  readonly status: "completed";
  readonly sealedSession: string;
}

interface FailedRefreshFlight {
  readonly status: "failed";
  readonly outcome: "terminal" | "transient";
}

type RefreshFlight = PendingRefreshFlight | CompletedRefreshFlight | FailedRefreshFlight;

const terminalRefreshCodes = new Set([
  "FORBIDDEN",
  "INVALID_CREDENTIALS",
  "INVALID_OTP",
  "INVALID_TOKEN",
  "SESSION_EXPIRED",
  "TOKEN_EXPIRED",
  "UNAUTHORIZED"
]);

/**
 * Reads the HTTP status and Directus error code from an unknown upstream failure.
 * @param error - Upstream error thrown by ofetch.
 * @returns The discovered status and error code.
 */
function readRefreshFailure(error: unknown): { status?: number; code?: string } {
  if (!isRecord(error)) return {};
  let status: number | undefined;
  if (isInteger(error.statusCode)) {
    status = error.statusCode;
  } else if (isRecord(error.response) && isInteger(error.response.status)) {
    status = error.response.status;
  }

  let data: Record<string, unknown> | undefined;
  if (isRecord(error.data)) {
    data = error.data;
  } else if (isRecord(error.response) && isRecord(error.response._data)) {
    data = error.response._data;
  }

  let code: string | undefined;
  const errors = data?.errors;
  if (isArray(errors)) {
    const first = errors[0];
    if (isRecord(first) && isRecord(first.extensions) && isString(first.extensions.code)) {
      code = first.extensions.code;
    }
  }

  return {
    ...(isDefined(status) ? { status } : {}),
    ...(isDefined(code) ? { code } : {})
  };
}

/**
 * Classifies a refresh failure without treating upstream availability failures as logout.
 * @param error - Upstream error thrown by ofetch.
 * @returns Whether the local session must be invalidated.
 */
function classifyRefreshFailure(error: unknown): "terminal" | "transient" {
  const { status, code } = readRefreshFailure(error);
  if (code && terminalRefreshCodes.has(code) && isDefined(status) && status >= 400 && status < 500)
    return "terminal";
  if (status === 401) return "terminal";
  return "transient";
}

/**
 * Creates the stable service error exposed for refresh availability failures.
 * @param cause - The original upstream failure.
 * @returns An HTTP 503 error for a temporary refresh failure.
 */
function createTransientRefreshError(cause: unknown) {
  return createError({
    statusCode: 503,
    statusMessage: "Directus refresh temporarily unavailable",
    cause
  });
}

const REFRESH_STORAGE_MOUNT = "directus-auth-refresh";
const REFRESH_FLIGHT_TTL = 30_000;
const REFRESH_RESULT_TTL = 5_000;

interface RefreshStorage {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T, options?: { ttl?: number }): Promise<void>;
}

/**
 * Resolves the Nitro storage mount used to coordinate refresh requests.
 *
 * @returns The configured refresh-flight storage.
 */
async function getRefreshStorage(): Promise<RefreshStorage> {
  return useStorage(REFRESH_STORAGE_MOUNT);
}

/**
 * Builds a Directus endpoint from the private runtime base URL.
 *
 * @param event - Incoming request event.
 * @param path - Directus-relative endpoint path.
 * @returns An upstream Directus URL.
 */
function getDirectusEndpoint(event: H3Event, path: string): string {
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

/**
 * Waits for another request to publish a storage-backed refresh result.
 *
 * @param event - Incoming request event.
 * @param key - Refresh-flight storage key.
 * @returns The completed session or undefined after failure/timeout.
 */
async function waitForRefreshFlight(
  event: H3Event,
  key: string
): Promise<DirectusSession | undefined> {
  const storage = await getRefreshStorage();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const flight = await storage.getItem<RefreshFlight>(key);
    if (flight?.status === "completed") {
      const session = await readSealedRefreshSession(event, flight.sealedSession);
      if (!session) return undefined;
      return session;
    }
    if (flight?.status === "failed") {
      if (flight.outcome === "transient") throw createTransientRefreshError(undefined);
      if (flight.outcome === "terminal") return undefined;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
}

/**
 * Restores a sealed refresh result and writes it to the current response cookie.
 *
 * @param event - Incoming request event.
 * @param sealedSession - H3-sealed, versioned session value from Nitro storage.
 * @returns The validated session or undefined when the stored value is invalid or expired.
 */
async function readSealedRefreshSession(
  event: H3Event,
  sealedSession: string
): Promise<DirectusSession | undefined> {
  const resolved = await getDirectusSessionDetails(event, {
    sealedValue: sealedSession,
    allowExpired: false
  });
  if (!resolved) return undefined;
  if (resolved.matchedSecretSlot === "active") writeDirectusSessionCookie(event, sealedSession);
  return resolved.session;
}

/**
 * Creates a rotated session without refetching the unchanged user snapshot.
 *
 * @param current - The session whose refresh token was rotated.
 * @param authentication - The validated replacement tokens.
 * @returns The server-only session with the replacement token pair.
 */
function createRotatedDirectusSession(
  current: DirectusSession,
  authentication: DirectusAuthenticationResult
): DirectusSession {
  return {
    accessToken: authentication.accessToken,
    refreshToken: authentication.refreshToken,
    expiresAt: Date.now() + (authentication.expires ?? 900_000),
    snapshot: {
      ...current.snapshot,
      requiresTfaSetup: decodeDirectusTfaSetupRequirement(authentication.accessToken)
    }
  };
}

/**
 * Records a failed refresh flight after Directus has rotated the token pair.
 *
 * @param storage - Refresh coordination storage.
 * @param key - Refresh-flight storage key.
 * @param cause - The failure that made the rotated session unusable.
 * @returns The original failure unless recording the failure itself fails.
 */
async function failAfterRefreshRotation(
  storage: RefreshStorage,
  key: string,
  cause: unknown
): Promise<never> {
  await attempt(() =>
    storage.setItem(key, { status: "failed", outcome: "terminal" }, { ttl: REFRESH_RESULT_TTL })
  );
  throw cause;
}

/**
 * Refreshes an expiring session through a Nitro-storage single-flight record.
 *
 * The storage record contains a short-lived server-only result so concurrent requests can reuse
 * the rotated token pair without keeping a process-local Promise map. A deployment still needs a
 * storage driver with read-after-write consistency for strongest coordination.
 *
 * @param event - Incoming request event.
 * @returns The fresh session or undefined when no valid session remains.
 */
export async function ensureFreshDirectusSession(
  event: H3Event
): Promise<DirectusSession | undefined> {
  const current = await getDirectusSession(event);
  if (!current) return undefined;
  const auth = getDirectusRuntimeConfig(event).directusClient.auth;
  if (current.expiresAt > Date.now() + auth.refreshSafetyWindow) return current;

  const storage = await getRefreshStorage();
  const key = "flight:" + hash(current.refreshToken);
  const existing = await storage.getItem<RefreshFlight>(key);
  if (existing?.status === "completed") {
    return readSealedRefreshSession(event, existing.sealedSession);
  }
  if (existing?.status === "failed") {
    if (existing.outcome === "transient") throw createTransientRefreshError(undefined);
    if (existing.outcome === "terminal") {
      clearDirectusSession(event);
      return undefined;
    }
  }
  if (existing?.status === "pending" && existing.startedAt + REFRESH_FLIGHT_TTL > Date.now()) {
    return waitForRefreshFlight(event, key);
  }

  const owner = crypto.randomUUID();
  await storage.setItem(
    key,
    { status: "pending", owner, startedAt: Date.now() },
    { ttl: REFRESH_FLIGHT_TTL }
  );
  const claim = await storage.getItem<RefreshFlight>(key);
  if (claim?.status === "completed") {
    return readSealedRefreshSession(event, claim.sealedSession);
  }
  if (claim?.status === "pending" && claim.owner !== owner) {
    return waitForRefreshFlight(event, key);
  }

  const result = await attempt(async () => {
    return ofetch<unknown>(getDirectusEndpoint(event, "auth/refresh"), {
      method: "POST",
      body: { refresh_token: current.refreshToken, mode: "json" },
      retry: 0
    });
  });
  if (result.error !== null || result.data === null) {
    const outcome = classifyRefreshFailure(result.error);
    if (outcome === "terminal") {
      clearDirectusSession(event);
      await attempt(() =>
        storage.setItem(key, { status: "failed", outcome }, { ttl: REFRESH_RESULT_TTL })
      );
      return undefined;
    }
    await attempt(() => storage.setItem(key, { status: "failed", outcome }, { ttl: 100 }));
    throw createTransientRefreshError(result.error);
  }

  let authentication: DirectusAuthenticationResult;
  try {
    authentication = parseDirectusAuthenticationResponse(result.data);
  } catch (error) {
    clearDirectusSession(event);
    return failAfterRefreshRotation(storage, key, error);
  }

  let session: DirectusSession;
  let sealedSession: string;
  try {
    session = createRotatedDirectusSession(current, authentication);
    sealedSession = await sealDirectusSession(event, session);
    writeDirectusSessionCookie(event, sealedSession);
  } catch (error) {
    clearDirectusSession(event);
    return failAfterRefreshRotation(storage, key, error);
  }

  await attempt(() =>
    storage.setItem(key, { status: "completed", sealedSession }, { ttl: REFRESH_RESULT_TTL })
  );
  return session;
}

/**
 * Logs out upstream when possible and always clears the local cookie.
 *
 * @param event - Incoming request event.
 */
export async function destroyDirectusSession(event: H3Event): Promise<void> {
  const session = await getDirectusSession(event);
  const result = await attempt(async () => {
    if (session) {
      await ofetch(getDirectusEndpoint(event, "auth/logout"), {
        method: "POST",
        body: { refresh_token: session.refreshToken, mode: "json" }
      });
    }
  });
  clearDirectusSession(event);
  setResponseStatus(event, 204);
  if (result.error !== null) throw result.error;
}

/**
 * Reads the current token-free session snapshot after refreshing an expiring access token.
 *
 * @param event - Incoming request event.
 * @returns The safe snapshot or null.
 */
export async function readDirectusSessionSnapshot(
  event: H3Event
): Promise<DirectusSessionSnapshot | null> {
  return (await ensureFreshDirectusSession(event))?.snapshot ?? null;
}
