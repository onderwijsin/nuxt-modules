import { defineNuxtPlugin } from "#app";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";

import { createDirectusRestClient } from "../../utils/client";

/**
 * Installs a browser-only Directus client that can reach the same-origin proxy.
 *
 * @returns The injected browser client.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const origin = globalThis.location.origin;
  const directus = createDirectusRestClient({
    baseUrl: new URL(config.public.directus.proxy.path, origin).toString(),
    fetch: ofetch.create({ credentials: "same-origin" })
  });

  return { provide: { directus } };
});
