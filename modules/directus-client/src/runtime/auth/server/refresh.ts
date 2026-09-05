import type { H3Event } from "h3";
import { createError } from "h3";
import {
  attempt,
  isArray,
  isDefined,
  isInteger,
  isRecord,
  isString
} from "@onderwijsin/nuxt-module-utils/shared";
import { hash } from "ohash";
import { ofetch } from "ofetch";
import { useStorage } from "nitropack/runtime";

import {
  decodeDirectusTfaSetupRequirement,
  getDirectusEndpoint,
  parseDirectusAuthenticationResponse,
  type DirectusAuthenticationResult
} from "./authentication";
import {
  clearDirectusSession,
  getDirectusSession,
  getDirectusSessionDetails,
  sealDirectusSession,
  type DirectusSession,
  type DirectusSessionSnapshot,
  writeDirectusSessionCookie
} from "./session";
import { getDirectusRuntimeConfig } from "../../core/runtime-config";

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
      if (flight.outcome === "terminal") {
        clearDirectusSession(event);
        return undefined;
      }
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  throw createTransientRefreshError(undefined);
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

export async function readDirectusSessionSnapshot(
  event: H3Event
): Promise<DirectusSessionSnapshot | null> {
  return (await ensureFreshDirectusSession(event))?.snapshot ?? null;
}
