import { defineNuxtPlugin, useRequestEvent, useState } from "#app";

import { createServerDirectusClient } from "../../server/utils/client";
import type { DirectusSessionSnapshot } from "../../server/utils/session";

/** Loads session utilities from a separate server chunk to avoid SSR-entry naming collisions. */
const { getDirectusSession } = await import("../../server/utils/session.js");

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
