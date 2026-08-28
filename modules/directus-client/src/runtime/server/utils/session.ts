import {
  deleteCookie,
  getCookie,
  sealSession,
  setCookie,
  unsealSession,
  useSession,
  type H3Event,
  type SessionConfig
} from "h3";
import { attempt, isNonBlankString, isString } from "@onderwijsin/nuxt-module-utils";
import { z } from "zod";

import { getDirectusRuntimeConfig } from "./runtime-config";

/** Token-free user data persisted with a Directus session. */
export interface DirectusSessionSnapshot {
  readonly userId: string;
  readonly email: string | null;
  readonly firstName: string | null;
  readonly lastName: string | null;
  /** Whether Directus requires this session to complete TFA setup. */
  readonly requiresTfaSetup: boolean;
}

/** Internal cookie payload. Tokens never leave server utilities. */
export interface DirectusSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly snapshot: DirectusSessionSnapshot;
}

/** Maximum sealed cookie value length accepted by the Directus session boundary. */
export const DIRECTUS_SESSION_COOKIE_LIMIT = 3800;

// The payload version is authenticated inside H3's seal; the prefix versions the outer cookie
// envelope so legacy or future formats can be rejected or routed before decryption.
const DIRECTUS_SESSION_VERSION = 1;
const DIRECTUS_SESSION_DATA_PREFIX = "boop1:";

const directusSessionSnapshotSchema = z.object({
  userId: z.string().min(1),
  email: z.string().nullable().default(null),
  firstName: z.string().nullable().default(null),
  lastName: z.string().nullable().default(null),
  requiresTfaSetup: z.boolean().default(false)
});

const directusSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number().int().positive(),
  snapshot: directusSessionSnapshotSchema
});

const sealedDirectusSessionSchema = z.object({
  directus: directusSessionSchema,
  formatVersion: z.literal(DIRECTUS_SESSION_VERSION),
  matchedSecretSlot: z.string().min(1)
});

type SealedDirectusSession = z.infer<typeof sealedDirectusSessionSchema>;

interface ResolvedDirectusSession {
  readonly session: DirectusSession;
  readonly matchedSecretSlot: string;
}

/**
 * Returns the configured cookie serialization options.
 *
 * @param event - Incoming request event.
 * @returns Cookie serialization options.
 */
function cookieOptions(event: H3Event) {
  const options = getDirectusRuntimeConfig(event).directusClient.auth;
  return {
    httpOnly: true,
    secure: options.cookie.secure,
    sameSite: options.cookie.sameSite,
    path: options.cookie.path,
    maxAge: options.cookie.maxAge,
    ...(options.cookie.domain ? { domain: options.cookie.domain } : {})
  } as const;
}

/**
 * Builds the H3 session configuration used by the Directus cookie wrapper.
 *
 * The session header is disabled because Directus authentication is intentionally cookie-only.
 * Cookie writes are performed by this module so the existing size guard and cookie policy remain
 * observable and consistent.
 *
 * @param event - Incoming request event.
 * @param secret - H3 sealing secret.
 * @returns H3 session configuration.
 */
function sessionConfig(event: H3Event, secret: string): SessionConfig {
  const auth = getDirectusRuntimeConfig(event).directusClient.auth;
  return {
    name: auth.cookie.name,
    password: secret,
    maxAge: auth.cookie.maxAge,
    cookie: false,
    sessionHeader: false
  };
}

/**
 * Returns active and previous session secrets in verification order.
 *
 * @param event - Incoming request event.
 * @returns Configured session secrets.
 */
function sessionSecrets(event: H3Event): readonly string[] {
  const auth = getDirectusRuntimeConfig(event).directusClient.auth;
  return auth.sessionSecret ? [auth.sessionSecret, ...(auth.previousSessionSecrets ?? [])] : [];
}

/**
 * Reads and verifies a sealed Directus session with active and previous keys.
 *
 * @param event - Incoming request event.
 * @param sealedValue - Raw sealed cookie value.
 * @returns The verified session and the key that opened it, or undefined.
 */
async function unsealDirectusSession(
  event: H3Event,
  sealedValue: string
): Promise<ResolvedDirectusSession | undefined> {
  for (const [index, secret] of sessionSecrets(event).entries()) {
    const result = await attempt(async () => {
      const unsealed = await unsealSession(event, sessionConfig(event, secret), sealedValue);
      const parsed = sealedDirectusSessionSchema.parse(unsealed.data);
      return {
        session: parsed.directus,
        matchedSecretSlot: index === 0 ? "active" : `previous-${index}`
      };
    });
    if (result.error === null && result.data !== null) return result.data;
  }
  return undefined;
}

/**
 * Seals a Directus session without writing it to the response.
 *
 * @param event - Incoming request event.
 * @param session - Server-only session payload.
 * @returns A bounded, versioned sealed session value.
 */
export async function sealDirectusSession(
  event: H3Event,
  session: DirectusSession
): Promise<string> {
  const [secret] = sessionSecrets(event);
  if (!secret) throw new Error("Directus session secret is not configured");

  const config = sessionConfig(event, secret);
  const manager = await useSession<SealedDirectusSession>(event, config);
  await manager.update({
    directus: session,
    formatVersion: DIRECTUS_SESSION_VERSION,
    matchedSecretSlot: "active"
  });
  const sealed = await sealSession(event, config);
  const cookieValue = DIRECTUS_SESSION_DATA_PREFIX + sealed;
  if (cookieValue.length > DIRECTUS_SESSION_COOKIE_LIMIT) {
    throw new Error("Directus session exceeds the cookie size limit");
  }
  return cookieValue;
}

/**
 * Writes a previously sealed Directus session to its configured cookie.
 *
 * @param event - Incoming request event.
 * @param cookieValue - Versioned sealed session value.
 */
export function writeDirectusSessionCookie(event: H3Event, cookieValue: string): void {
  const auth = getDirectusRuntimeConfig(event).directusClient.auth;
  setCookie(event, auth.cookie.name, cookieValue, cookieOptions(event));
}

/**
 * Seals a Directus session with the active secret and writes its versioned cookie.
 *
 * @param event - Incoming request event.
 * @param session - Server-only session payload.
 */
export async function setDirectusSession(event: H3Event, session: DirectusSession): Promise<void> {
  writeDirectusSessionCookie(event, await sealDirectusSession(event, session));
}

/**
 * Reads the current session from the configured sealed httpOnly cookie.
 *
 * Invalid cookies are ignored and cleared. Legacy unsigned cookies are never parsed as trusted
 * session data.
 *
 * @param event - Incoming request event.
 * @param sealedValue - Optional versioned sealed value supplied by refresh coordination.
 * @returns The validated session or undefined.
 */
export async function getDirectusSessionDetails(
  event: H3Event,
  sealedValue?: string
): Promise<ResolvedDirectusSession | undefined> {
  const config = getDirectusRuntimeConfig(event);
  const value = sealedValue ?? getCookie(event, config.directusClient.auth.cookie.name);
  if (!isString(value) || !isNonBlankString(value)) return undefined;
  if (!value.startsWith(DIRECTUS_SESSION_DATA_PREFIX)) {
    deleteCookie(event, config.directusClient.auth.cookie.name, cookieOptions(event));
    return undefined;
  }

  const resolved = await unsealDirectusSession(
    event,
    value.slice(DIRECTUS_SESSION_DATA_PREFIX.length)
  );
  if (resolved) {
    if (resolved.session.expiresAt <= Date.now()) {
      deleteCookie(event, config.directusClient.auth.cookie.name, cookieOptions(event));
      return undefined;
    }
    if (resolved.matchedSecretSlot !== "active") await setDirectusSession(event, resolved.session);
    return resolved;
  }

  deleteCookie(event, config.directusClient.auth.cookie.name, cookieOptions(event));
  return undefined;
}

/**
 * Reads the current session from the configured sealed httpOnly cookie.
 *
 * @param event - Incoming request event.
 * @returns The validated session or undefined.
 */
export async function getDirectusSession(event: H3Event): Promise<DirectusSession | undefined> {
  return (await getDirectusSessionDetails(event))?.session;
}

/**
 * Clears a local session regardless of upstream logout outcome.
 *
 * @param event - Incoming request event.
 */
export function clearDirectusSession(event: H3Event): void {
  const config = getDirectusRuntimeConfig(event);
  deleteCookie(event, config.directusClient.auth.cookie.name, cookieOptions(event));
}
