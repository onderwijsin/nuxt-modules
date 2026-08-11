import type { H3Event } from "h3";
import { createError, setResponseStatus } from "h3";
import { useRuntimeConfig } from "#imports";
import { attempt } from "@onderwijsin/nuxt-module-utils";
import { hash } from "ohash";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

import {
  clearDirectusSession,
  getDirectusSession,
  setDirectusSession,
  type DirectusSession,
  type DirectusSessionSnapshot
} from "./session";

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
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional()
  })
});

interface PendingRefreshFlight {
  readonly status: "pending";
  readonly owner: string;
  readonly startedAt: number;
}

interface CompletedRefreshFlight {
  readonly status: "completed";
  readonly session: DirectusSession;
}

interface FailedRefreshFlight {
  readonly status: "failed";
}

type RefreshFlight = PendingRefreshFlight | CompletedRefreshFlight | FailedRefreshFlight;

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
 * Nitro's storage runtime is server-bundle-only because its implementation imports a generated
 * virtual storage module. Loading it at request time keeps that virtual module out of application
 * and client resolution graphs.
 *
 * @returns The configured refresh-flight storage.
 */
async function getRefreshStorage(): Promise<RefreshStorage> {
  const { useStorage } = await import("nitropack/runtime");
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
  const baseUrl = useRuntimeConfig(event).directus.baseUrl;
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
    email: email,
    firstName: first_name,
    lastName: last_name
  };
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
  const tokens = directusTokenResponseSchema.parse(response).data;
  const session: DirectusSession = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires ?? 900_000),
    snapshot: await fetchDirectusCurrentUser(event, tokens.access_token)
  };
  setDirectusSession(event, session);
  return session;
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
      setDirectusSession(event, flight.session);
      return flight.session;
    }
    if (flight?.status === "failed") return undefined;
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
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
  const current = getDirectusSession(event);
  if (!current) return undefined;
  const safetyWindow = useRuntimeConfig(event).directus.auth.refreshSafetyWindow;
  if (current.expiresAt > Date.now() + safetyWindow) return current;

  const storage = await getRefreshStorage();
  const key = "flight:" + hash(current.refreshToken);
  const existing = await storage.getItem<RefreshFlight>(key);
  if (existing?.status === "completed") {
    setDirectusSession(event, existing.session);
    return existing.session;
  }
  if (existing?.status === "failed") {
    clearDirectusSession(event);
    return undefined;
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
    setDirectusSession(event, claim.session);
    return claim.session;
  }
  if (claim?.status === "pending" && claim.owner !== owner) {
    return waitForRefreshFlight(event, key);
  }

  const result = await attempt(async () => {
    const response = await ofetch<unknown>(getDirectusEndpoint(event, "auth/refresh"), {
      method: "POST",
      body: { refresh_token: current.refreshToken, mode: "json" }
    });
    const tokens = directusTokenResponseSchema.parse(response).data;
    const session: DirectusSession = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires ?? 900_000),
      snapshot: await fetchDirectusCurrentUser(event, tokens.access_token)
    };
    await storage.setItem(key, { status: "completed", session }, { ttl: REFRESH_RESULT_TTL });
    setDirectusSession(event, session);
    return session;
  });
  if (result.error !== null || result.data === null) {
    await storage.setItem(key, { status: "failed" }, { ttl: REFRESH_RESULT_TTL });
    clearDirectusSession(event);
    return undefined;
  }
  return result.data;
}

/**
 * Logs out upstream when possible and always clears the local cookie.
 *
 * @param event - Incoming request event.
 */
export async function destroyDirectusSession(event: H3Event): Promise<void> {
  const session = getDirectusSession(event);
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
 * Reads the persisted token-free session snapshot without contacting Directus.
 *
 * @param event - Incoming request event.
 * @returns The safe snapshot or null.
 */
export function readDirectusSessionSnapshot(event: H3Event): DirectusSessionSnapshot | null {
  return getDirectusSession(event)?.snapshot ?? null;
}
