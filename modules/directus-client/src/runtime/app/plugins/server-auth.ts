import { defineNuxtPlugin, useRequestEvent, useState } from "#app";

import { createServerDirectusClient } from "../../server/utils/client";
import type { DirectusSessionSnapshot } from "../../types/auth";

/**
 * Installs a request-scoped Directus client and exposes the safe session snapshot during SSR.
 *
 * This plugin is registered only when cookie authentication is enabled so applications that use
 * static, preview, or unauthenticated access do not read or serialize session cookies.
 *
 * @param nuxtApp Current Nuxt application instance.
 * @returns The injected request-scoped client.
 */
export default defineNuxtPlugin(() => {
  const event = useRequestEvent();
  const session = useState<DirectusSessionSnapshot | null>("directus:session", () => null);
  const authContext = event?.context.directusAuth;
  session.value = authContext?.snapshot ?? null;

  return {
    provide: {
      directus: createServerDirectusClient(event)
    }
  };
});
