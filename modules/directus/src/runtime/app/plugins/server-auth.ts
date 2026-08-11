import { defineNuxtPlugin, useRequestEvent, useState } from "#app";

import { createServerDirectusClient } from "../../server/utils/client";
import { getDirectusSession } from "../../server/utils/session";
import type { DirectusSessionSnapshot } from "../../server/utils/session";

/**
 * Installs a request-scoped Directus client and exposes the safe session snapshot during SSR.
 *
 * This plugin is registered only when cookie authentication is enabled so applications that use
 * static, preview, or unauthenticated access do not read or serialize session cookies.
 *
 * @returns The injected request-scoped client.
 */
export default defineNuxtPlugin(() => {
  const event = useRequestEvent();
  const session = useState<DirectusSessionSnapshot | null>("directus:session", () => null);
  session.value = event ? (getDirectusSession(event)?.snapshot ?? null) : null;

  return {
    provide: { directus: createServerDirectusClient(event) }
  };
});
