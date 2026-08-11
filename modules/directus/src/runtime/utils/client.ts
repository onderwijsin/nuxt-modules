import {
  createDirectus,
  rest,
  staticToken,
  type DirectusClient,
  type FetchInterface,
  type RestClient
} from "@directus/sdk";
import type { Schema } from "#directus";

/** Options for constructing a module-owned Directus REST client. */
export interface DirectusRestClientOptions {
  readonly baseUrl: string;
  readonly fetch?: FetchInterface;
  readonly accessToken?: string;
}

/** The typed REST client shared by browser-proxy and server-direct callers. */
export type DirectusRestClient = DirectusClient<Schema> & RestClient<Schema>;

/** Creates a REST-only Directus client and attaches one already-resolved credential.
 * @param options Client URL, fetch implementation, and optional access token.
 * @returns A typed REST client.
 */
export function createDirectusRestClient(options: DirectusRestClientOptions): DirectusRestClient {
  let client = createDirectus<Schema>(options.baseUrl, {
    ...(options.fetch ? { globals: { fetch: options.fetch } } : {})
  }).with(rest());

  if (options.accessToken) {
    client = client.with(staticToken(options.accessToken));
  }

  return client;
}
