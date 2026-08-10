import { createDirectus, rest } from "@directus/sdk";
import type { Schema } from "#directus";
import { defineNuxtPlugin } from "#app";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";

/**
 * Installs a browser-only Directus client that can reach the same-origin proxy.
 *
 * @returns The injected browser client.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const origin = globalThis.location.origin;
  const directus = createDirectus<Schema>(
    new URL(config.public.directus.proxy.path, origin).toString(),
    {
      globals: {
        fetch: ofetch.create({ credentials: "same-origin" })
      }
    }
  ).with(rest());

  return { provide: { directus } };
});
