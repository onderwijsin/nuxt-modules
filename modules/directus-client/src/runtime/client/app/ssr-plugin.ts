import { defineNuxtPlugin, useRequestEvent } from "#app";

import { createServerDirectusClient } from "../server/create-client";

/**
 * Installs a fresh, request-scoped Directus client during SSR.
 *
 * @param nuxtApp Current Nuxt application instance.
 * @returns The injected request-scoped client.
 */
export default defineNuxtPlugin(() => {
  return {
    provide: { directus: createServerDirectusClient(useRequestEvent()) }
  };
});
