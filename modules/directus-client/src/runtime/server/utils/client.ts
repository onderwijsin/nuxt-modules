import type { H3Event } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";
import type { Schema } from "#directus";
import {
  createDirectusRestClient,
  type DirectusRestClient
} from "@onderwijsin/nuxt-module-utils/shared";

import { resolveDirectusRequestContext } from "./credentials";
/** The typed REST client used by application server code. */
export type DirectusSchemaClient = DirectusRestClient<Schema>;

/**
 * Creates a new Directus REST client for one server request.
 *
 * @param event Optional request event used to read request-scoped runtime configuration.
 * @returns A fresh, non-shared Directus REST client.
 */
export function createServerDirectusClient(event?: H3Event): DirectusSchemaClient {
  const config = useRuntimeConfig(event);
  if (!config.directusClient.baseUrl) {
    throw new Error("Directus baseUrl is required before creating a Directus client.");
  }

  const serverFetch = ofetch.create({
    onRequest: async ({ options }) => {
      if (!event) return;

      const authState = config.directusClient.auth.enabled
        ? await event.context.directusAuth?.resolve()
        : undefined;
      const sessionAccessToken = authState?.accessToken;

      const { credential } = resolveDirectusRequestContext(event, {
        preview: config.public.directusClient.preview,
        staticToken: config.directusClient.staticToken,
        sessionAccessToken
      });

      const headers = new Headers(options.headers);
      headers.delete("authorization");
      if (credential.accessToken) headers.set("authorization", "Bearer " + credential.accessToken);
      options.headers = headers;
    }
  });

  return createDirectusRestClient<Schema>({
    baseUrl: config.directusClient.baseUrl,
    fetch: serverFetch
  });
}
