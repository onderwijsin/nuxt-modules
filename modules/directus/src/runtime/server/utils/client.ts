import type { H3Event } from "h3";
import { useNuxtApp, useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";

import { resolveDirectusRequestContext } from "./credentials";
import { createDirectusRestClient, type DirectusRestClient } from "../../utils/client";

/** The typed REST client used by application server code. */
export type DirectusSchemaClient = DirectusRestClient;

/**
 * Creates a new Directus REST client for one server request.
 *
 * @param event Optional request event used to read request-scoped runtime configuration.
 * @returns A fresh, non-shared Directus REST client.
 */
export function createServerDirectusClient(event?: H3Event): DirectusSchemaClient {
  const config = useRuntimeConfig(event);
  if (!config.directus.baseUrl) {
    throw new Error("Directus baseUrl is required before creating a Directus client.");
  }

  const nuxtApp = useNuxtApp();

  const serverFetch = ofetch.create({
    onRequest: async ({ options }) => {
      if (!event) return;

      let sessionAccessToken: string | undefined;
      if (config.directus.auth.enabled) {
        console.log("Ensuring fresh Directus session on request");
        const { ensureFreshDirectusSession } = await import("./auth.js");
        sessionAccessToken = (
          await nuxtApp.runWithContext(async () => await ensureFreshDirectusSession(event))
        )?.accessToken;
      }

      const { credential } = resolveDirectusRequestContext(event, {
        preview: config.public.directus.preview,
        staticToken: config.directus.staticToken,
        sessionAccessToken
      });

      const headers = new Headers(options.headers);
      headers.delete("authorization");
      if (credential.accessToken) headers.set("authorization", "Bearer " + credential.accessToken);
      options.headers = headers;
    }
  });

  return createDirectusRestClient({
    baseUrl: config.directus.baseUrl,
    fetch: serverFetch
  });
}
