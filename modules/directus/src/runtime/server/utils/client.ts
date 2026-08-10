import type { H3Event } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";

import { resolveDirectusRuntimeRequestContext } from "./credentials";
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

  const { credential } = resolveDirectusRuntimeRequestContext(event);

  return createDirectusRestClient({
    baseUrl: config.directus.baseUrl,
    fetch: ofetch,
    accessToken: credential.accessToken
  });
}
