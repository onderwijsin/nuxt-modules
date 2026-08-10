import {
  createDirectus,
  rest,
  staticToken,
  type DirectusClient,
  type RestClient
} from "@directus/sdk";
import type { H3Event } from "h3";
import type { Schema } from "#directus";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";

import { resolveDirectusCredential } from "./credentials";

/** The typed REST client used by application server code. */
export type DirectusSchemaClient = DirectusClient<Schema> & RestClient<Schema>;

/**
 * Creates a new Directus REST client for one server request.
 *
 * @param event Optional request event used to read request-scoped runtime configuration.
 * @param sessionAccessToken Optional session token reserved for the auth stage.
 * @returns A fresh, non-shared Directus REST client.
 */
export function createServerDirectusClient(
  event?: H3Event,
  sessionAccessToken?: string
): DirectusSchemaClient {
  const config = useRuntimeConfig(event);
  if (!config.directus.baseUrl) {
    throw new Error("Directus baseUrl is required before creating a Directus client.");
  }

  const credential = resolveDirectusCredential({
    sessionAccessToken,
    staticToken: config.directus.staticToken
  });

  let client = createDirectus<Schema>(config.directus.baseUrl, {
    globals: { fetch: ofetch }
  }).with(rest());

  if (credential.accessToken) {
    client = client.with(staticToken(credential.accessToken));
  }

  return client;
}
