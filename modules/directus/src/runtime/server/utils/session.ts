import { deleteCookie, getCookie, setCookie, type H3Event } from "h3";
import { useRuntimeConfig } from "#imports";
import { attemptSync, isNonBlankString, isString } from "@onderwijsin/nuxt-module-utils";
import { z } from "zod";

/** Token-free user data persisted with a Directus session. */
export interface DirectusSessionSnapshot {
  readonly userId: string;
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;
}

/** Internal cookie payload. Tokens never leave server utilities. */
export interface DirectusSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly snapshot: DirectusSessionSnapshot;
}

/**
 * Maximum encoded cookie value length.
 *
 * This leaves headroom below the usual 4096-byte browser cookie limit for the cookie name,
 * attributes, and future serialization overhead. Sessions fail closed when they exceed it rather
 * than being truncated.
 */
export const DIRECTUS_SESSION_COOKIE_LIMIT = 3800;

const directusSessionSnapshotSchema = z.object({
  userId: z.string().min(1),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

const directusSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number(),
  snapshot: directusSessionSnapshotSchema
});

/**
 * Encodes UTF-8 text as an unpadded base64url value.
 *
 * @param value - Text to encode.
 * @returns The base64url representation.
 */
function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCodePoint(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/**
 * Decodes a base64url value as UTF-8 text.
 *
 * @param value - Encoded value to decode.
 * @returns Decoded text or undefined for malformed input.
 */
function base64UrlDecode(value: string): string | undefined {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const result = attemptSync(() => {
    const binary = atob(padded);
    return new TextDecoder().decode(
      Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0)
    );
  });
  return result.error === null && result.data !== null ? result.data : undefined;
}

/**
 * Serializes a session into a bounded, URL-safe cookie value.
 *
 * @param session - Server-only session payload.
 * @returns The encoded cookie value.
 */
export function serializeDirectusSession(session: DirectusSession): string {
  const value = base64UrlEncode(JSON.stringify(session));
  if (value.length > DIRECTUS_SESSION_COOKIE_LIMIT) {
    throw new Error("Directus session exceeds the cookie size limit");
  }
  return value;
}

/**
 * Parses and validates a session cookie without throwing on malformed user input.
 *
 * @param value - Raw cookie value.
 * @returns A validated session or undefined.
 */
export function deserializeDirectusSession(value: string | undefined): DirectusSession | undefined {
  if (
    !isString(value) ||
    !isNonBlankString(value) ||
    value.length > DIRECTUS_SESSION_COOKIE_LIMIT
  ) {
    return undefined;
  }
  const decoded = base64UrlDecode(value);
  if (!decoded) return undefined;
  const parsed = attemptSync(() => directusSessionSchema.parse(JSON.parse(decoded)));
  if (parsed.error !== null || parsed.data === null) return undefined;
  return parsed.data;
}

/**
 * Builds the configured secure cookie attributes.
 *
 * @param event - Incoming request event.
 * @returns Cookie serialization options.
 */
function cookieOptions(event: H3Event) {
  const options = useRuntimeConfig(event).directus.auth;
  return {
    httpOnly: true,
    secure: options.cookie.secure,
    sameSite: options.cookie.sameSite,
    path: options.cookie.path,
    maxAge: options.cookie.maxAge,
    ...(options.cookie.domain ? { domain: options.cookie.domain } : {})
  };
}

/**
 * Reads the current session from the configured httpOnly cookie.
 *
 * @param event - Incoming request event.
 * @returns The validated session or undefined.
 */
export function getDirectusSession(event: H3Event): DirectusSession | undefined {
  const config = useRuntimeConfig(event);
  return deserializeDirectusSession(getCookie(event, config.directus.auth.cookie.name));
}

/**
 * Replaces the complete session atomically from the request's perspective.
 *
 * @param event - Incoming request event.
 * @param session - Server-only session payload.
 */
export function setDirectusSession(event: H3Event, session: DirectusSession): void {
  const config = useRuntimeConfig(event);
  setCookie(
    event,
    config.directus.auth.cookie.name,
    serializeDirectusSession(session),
    cookieOptions(event)
  );
}

/**
 * Clears a local session regardless of upstream logout outcome.
 *
 * @param event - Incoming request event.
 */
export function clearDirectusSession(event: H3Event): void {
  const config = useRuntimeConfig(event);
  deleteCookie(event, config.directus.auth.cookie.name, cookieOptions(event));
}
