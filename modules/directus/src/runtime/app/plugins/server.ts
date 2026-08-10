import { defineNuxtPlugin, useRequestEvent, useState } from "#app";

import { createServerDirectusClient } from "../../server/utils/client";
import { getDirectusSession } from "../../server/utils/session";
import type { DirectusSessionSnapshot } from "../../server/utils/session";

/**
 * Installs a fresh, request-scoped Directus client during SSR.
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
