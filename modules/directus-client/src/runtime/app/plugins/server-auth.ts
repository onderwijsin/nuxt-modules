import { defineNuxtPlugin, useRequestEvent, useRuntimeConfig, useState } from "#app";

import { createServerDirectusClient } from "../../server/utils/client";
import {
  loginServer,
  logoutServer,
  redeemMagicLinkServer,
  refreshServer,
  requestMagicLinkServer,
  requestPasswordResetServer,
  resetPasswordServer
} from "../../server/utils/auth-server";
import type { DirectusSessionSnapshot } from "../../server/utils/session";
import type { DirectusAuthServer } from "../composables/directus-auth";

/** Loads authentication utilities from a separate server chunk to avoid SSR-entry naming collisions. */
const { ensureFreshDirectusSession } = await import("../../server/utils/auth.js");

/**
 * Installs a request-scoped Directus client and exposes the safe session snapshot during SSR.
 *
 * This plugin is registered only when cookie authentication is enabled so applications that use
 * static, preview, or unauthenticated access do not read or serialize session cookies.
 *
 * @param nuxtApp Current Nuxt application instance.
 * @returns The injected request-scoped client.
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  const event = useRequestEvent();

  if (event) {
    event.context.nitro = {
      ...event.context.nitro,
      runtimeConfig: useRuntimeConfig()
    };
  }

  // Load fresh session state in the server plugin so middleware sees the authenticated SSR state.
  const session = useState<DirectusSessionSnapshot | null>("directus:session", () => null);
  session.value = event ? ((await ensureFreshDirectusSession(event))?.snapshot ?? null) : null;
  const directusAuthServer: DirectusAuthServer | undefined = event
    ? {
        login: (input) => loginServer(event, input),
        refresh: () => refreshServer(event),
        logout: () => logoutServer(event),
        requestPasswordReset: (email) => requestPasswordResetServer(event, email),
        resetPassword: (token, password) => resetPasswordServer(event, token, password),
        requestMagicLink: (email) => requestMagicLinkServer(event, email),
        redeemMagicLink: (token, otp) => redeemMagicLinkServer(event, token, otp)
      }
    : undefined;

  return {
    provide: {
      directus: createServerDirectusClient(event, nuxtApp),
      directusAuthServer
    }
  };
});
