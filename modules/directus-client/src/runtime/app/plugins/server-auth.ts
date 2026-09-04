import { defineNuxtPlugin, useRequestEvent, useState } from "#app";

import { createServerDirectusClient } from "../../server/utils/client";
import type { DirectusSessionSnapshot } from "../../types/auth";

/**
 * Installs a request-scoped Directus client and exposes the safe session snapshot during SSR.
 *
 * This plugin is registered only when cookie authentication is enabled so applications that use
 * static, preview, or unauthenticated access do not read or serialize session cookies.
 *
 * @returns The injected request-scoped client.
 */
export default defineNuxtPlugin(async () => {
  const event = useRequestEvent();
  const session = useState<DirectusSessionSnapshot | null>("directus:session", () => null);
  const authState = event ? await event.context.directusAuth?.resolve() : undefined;
  session.value = authState?.snapshot ?? null;

  return {
    provide: {
      directus: createServerDirectusClient(event)
    }
  };
});
