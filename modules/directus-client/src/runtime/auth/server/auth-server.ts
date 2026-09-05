import type { H3Event } from "h3";
import { createError } from "h3";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

import {
  createDirectusSession,
  destroyDirectusSession,
  ensureFreshDirectusSession,
  establishDirectusSession,
  parseDirectusAuthenticationResponse
} from "./auth";
import type { DirectusSessionSnapshot } from "./session";
import { getDirectusRuntimeConfig } from "../../core/runtime-config";
import { attempt } from "@onderwijsin/nuxt-module-utils/shared";

/** Validated login input accepted by the server authentication utility. */
export const loginServerSchema = z.object({
  email: z.email().max(1024),
  password: z.string().min(1).max(512),
  otp: z.string().min(1).max(6).optional()
});

/** Validated magic-link redemption input accepted by the server authentication utility. */
export const redeemMagicLinkServerSchema = z.object({
  magicLinkToken: z.string().min(1).max(1024),
  otp: z.string().min(1).max(6).optional()
});

/** Validated password-reset request input accepted by the server utility. */
export const requestPasswordResetServerSchema = z.object({
  email: z.email().max(1024)
});

/** Validated password-reset input accepted by the server utility. */
export const resetPasswordServerSchema = z.object({
  token: z.string().min(1).max(1024),
  password: z.string().min(1).max(512)
});

/** Validated magic-link request input accepted by the server utility. */
export const requestMagicLinkServerSchema = z.object({
  email: z.email().max(1024)
});

/**
 * Creates a session from Directus credentials.
 * @param event - Incoming application request event.
 * @param input - Validated Directus login credentials.
 * @returns The token-free session snapshot.
 */
export async function loginServer(
  event: H3Event,
  input: Parameters<typeof createDirectusSession>[1]
): Promise<DirectusSessionSnapshot> {
  const session = await createDirectusSession(event, input);
  return session.snapshot;
}

/**
 * Refreshes the current Directus session.
 * @param event - Incoming application request event.
 * @returns The refreshed token-free session snapshot.
 */
export async function refreshServer(event: H3Event): Promise<DirectusSessionSnapshot> {
  const session = await ensureFreshDirectusSession(event);
  if (!session)
    throw createError({ statusCode: 401, statusMessage: "Directus session is invalid" });
  return session.snapshot;
}

/**
 * Clears the current Directus session.
 * @param event - Incoming application request event.
 * @returns Resolves after the session has been cleared.
 */
export async function logoutServer(event: H3Event): Promise<void> {
  await destroyDirectusSession(event);
}

/**
 * Sends a password-reset email through Directus.
 * @param event - Incoming application request event.
 * @param email - Email address receiving the reset link.
 * @returns Resolves after Directus accepts the request.
 */
export async function requestPasswordResetServer(event: H3Event, email: string): Promise<void> {
  const config = getDirectusRuntimeConfig(event);
  const resetUrl = config.directusClient.auth.passwordResetUrl;
  if (!resetUrl)
    throw createError({ statusCode: 500, statusMessage: "Directus passwordResetUrl is required" });
  await ofetch(joinURL(config.directusClient.baseUrl, "auth/password/request"), {
    method: "POST",
    body: { email, reset_url: resetUrl }
  });
}

/**
 * Resets a Directus password.
 * @param event - Incoming application request event.
 * @param token - Directus password-reset token.
 * @param password - New password.
 * @returns Resolves after Directus accepts the reset.
 */
export async function resetPasswordServer(
  event: H3Event,
  token: string,
  password: string
): Promise<void> {
  const config = getDirectusRuntimeConfig(event);
  await ofetch(joinURL(config.directusClient.baseUrl, "auth/password/reset"), {
    method: "POST",
    body: { token, password }
  });
}

/**
 * Sends a magic-link email through Directus.
 * @param event - Incoming application request event.
 * @param email - Email address receiving the magic link.
 * @returns Resolves after Directus accepts the request.
 */
export async function requestMagicLinkServer(event: H3Event, email: string): Promise<void> {
  const config = getDirectusRuntimeConfig(event);
  const redirectUrl = config.directusClient.auth.magicLinks.redirectUrl;
  if (!redirectUrl)
    throw createError({
      statusCode: 500,
      statusMessage: "Directus magicLinks.redirectUrl is required when magic links are enabled"
    });

  const { data, error } = await attempt(async () => {
    return ofetch(joinURL(config.directusClient.baseUrl, "auth/magic-links/request"), {
      method: "POST",
      body: { email, redirectUrl }
    });
  });
  if (error) {
    throw createError({ statusCode: 400, statusMessage: "Failed to request magic link" });
  }
  return data;
}

/**
 * Redeems a magic link and establishes the current Directus session.
 * @param event - Incoming application request event.
 * @param token - Magic-link token.
 * @param otp - Optional one-time password.
 * @returns The token-free session snapshot.
 */
export async function redeemMagicLinkServer(
  event: H3Event,
  token: string,
  otp?: string
): Promise<DirectusSessionSnapshot> {
  const config = getDirectusRuntimeConfig(event);

  const { data, error } = await attempt(async () => {
    return ofetch(joinURL(config.directusClient.baseUrl, "auth/magic-links/redeem"), {
      method: "POST",
      body: { token, ...(otp ? { otp } : {}), mode: "json" }
    });
  });

  if (error) {
    throw createError({ statusCode: 400, statusMessage: "Failed to redeem magic link" });
  }
  const session = await establishDirectusSession(event, parseDirectusAuthenticationResponse(data));
  return session.snapshot;
}
