import { defineNuxtPlugin, useRequestEvent } from "#app";

import { createServerDirectusClient } from "../../server/utils/client";

/**
 * Installs a fresh, request-scoped Directus client during SSR.
 *
 * @returns The injected request-scoped client.
 */
export default defineNuxtPlugin(() => {
  return {
    provide: { directus: createServerDirectusClient(useRequestEvent() ?? undefined) }
  };
});
