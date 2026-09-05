import type { H3Event } from "h3";
import { createError } from "h3";
import { useRuntimeConfig } from "#imports";
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

import {
  type CoordinatedRefreshResult,
  getRefreshCoordinator,
  type FailedRefreshFlight,
  type RefreshOwnerResult
} from "./refresh-coordinator";
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

/**
 * Restores a sealed refresh result and writes it to the current response cookie.
 * @param event - Incoming request event.
 * @param sealedSession - H3-sealed, versioned session value from refresh coordination.
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

function failedResult(
  outcome: FailedRefreshFlight["outcome"],
  error?: unknown
): RefreshOwnerResult<DirectusSession> {
  return {
    flight: { status: "failed", outcome },
    ...(isDefined(error) ? { error } : {})
  };
}

/**
 * Executes a refresh through the auth-owned memory or Redis coordinator.
 * @param event - Incoming request event.
 * @param current - The expiring session to refresh.
 * @returns The local refresh outcome and its reusable coordination result.
 */
async function runRefreshFlight(
  event: H3Event,
  current: DirectusSession
): Promise<CoordinatedRefreshResult<DirectusSession>> {
  const key = hash(current.refreshToken);
  const coordinator = getRefreshCoordinator();
  return coordinator.coordinate(key, async (): Promise<RefreshOwnerResult<DirectusSession>> => {
    const result = await attempt(async () => {
      return ofetch<unknown>(getDirectusEndpoint(event, "auth/refresh"), {
        method: "POST",
        body: { refresh_token: current.refreshToken, mode: "json" },
        retry: 0,
        timeout: 10_000
      });
    });
    if (result.error !== null || result.data === null) {
      const outcome = classifyRefreshFailure(result.error);
      if (outcome === "terminal") clearDirectusSession(event);
      return failedResult(
        outcome,
        outcome === "transient" ? createTransientRefreshError(result.error) : undefined
      );
    }

    let authentication: DirectusAuthenticationResult;
    try {
      authentication = parseDirectusAuthenticationResponse(result.data);
    } catch (error) {
      clearDirectusSession(event);
      return failedResult("terminal", error);
    }

    try {
      const session = createRotatedDirectusSession(current, authentication);
      const sealedSession = await sealDirectusSession(event, session);
      writeDirectusSessionCookie(event, sealedSession);
      return { flight: { status: "completed", sealedSession }, value: session };
    } catch (error) {
      clearDirectusSession(event);
      return failedResult("terminal", error);
    }
  });
}

/**
 * Refreshes an expiring session through the supported auth coordinator.
 *
 * Memory deployments coordinate only within one server process. Multi-process, multi-container,
 * and multi-replica deployments must configure the `directus-auth-refresh` Nitro mount with Redis.
 *
 * @param event - Incoming request event.
 * @returns The fresh session or undefined when no valid session remains.
 */
export async function ensureFreshDirectusSession(
  event: H3Event
): Promise<DirectusSession | undefined> {
  const current = await getDirectusSession(event);
  if (!current) return undefined;
  const auth = useRuntimeConfig(event).directusClient.auth;
  if (current.expiresAt > Date.now() + auth.refreshSafetyWindow) return current;

  let result: CoordinatedRefreshResult<DirectusSession>;
  try {
    result = await runRefreshFlight(event, current);
  } catch (error) {
    throw createTransientRefreshError(error);
  }

  if (result.source === "owner") {
    if (result.flight.status === "completed") {
      if (result.value) return result.value;
      return readSealedRefreshSession(event, result.flight.sealedSession);
    }
    if (result.flight.outcome === "terminal") {
      if (isDefined(result.error)) throw result.error;
      clearDirectusSession(event);
      return undefined;
    }
    if (isDefined(result.error)) throw result.error;
    throw createTransientRefreshError(undefined);
  }

  if (result.flight.status === "completed") {
    return readSealedRefreshSession(event, result.flight.sealedSession);
  }
  if (result.flight.outcome === "terminal") {
    clearDirectusSession(event);
    return undefined;
  }
  throw createTransientRefreshError(undefined);
}

export async function readDirectusSessionSnapshot(
  event: H3Event
): Promise<DirectusSessionSnapshot | null> {
  return (await ensureFreshDirectusSession(event))?.snapshot ?? null;
}
