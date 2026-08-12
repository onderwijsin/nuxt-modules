import type { H3Event } from "h3";
import { useRuntimeConfig } from "#imports";

import type { DirectusPreviewContext, DirectusPreviewOptions } from "../../utils/preview";
import { getDirectusPreviewContext } from "./preview";

/** A server-side credential selected for one Directus request. */
export interface DirectusCredential {
  readonly accessToken?: string;
  readonly source: "preview" | "session" | "static" | "none";
}

/**
 * Selects the credential for a request without allowing caller-provided headers to win.
 *
 * Session credentials are accepted here before session auth is implemented so the later auth
 * stage can share this boundary with the proxy and server client.
 *
 * @param options Candidate credentials ordered by precedence.
 * @returns The single credential that may be sent upstream.
 */
export function resolveDirectusCredential(options: {
  readonly previewAccessToken?: string;
  readonly sessionAccessToken?: string;
  readonly staticToken?: string;
}): DirectusCredential {
  if (options.previewAccessToken) {
    return { accessToken: options.previewAccessToken, source: "preview" };
  }

  if (options.sessionAccessToken) {
    return { accessToken: options.sessionAccessToken, source: "session" };
  }

  if (options.staticToken) {
    return { accessToken: options.staticToken, source: "static" };
  }

  return { source: "none" };
}

/** All request-scoped Directus context resolved before a client is created. */
export interface DirectusRequestContext {
  readonly preview: DirectusPreviewContext;
  readonly credential: DirectusCredential;
}

/**
 * Resolves preview, session, and static credentials in their single precedence boundary.
 * @param event Optional request event containing preview context.
 * @param options Credential candidates and preview configuration.
 * @returns The request preview context and selected credential.
 */
export function resolveDirectusRequestContext(
  event: H3Event | undefined,
  options: {
    readonly preview: DirectusPreviewOptions;
    readonly staticToken?: string;
    readonly sessionAccessToken?: string;
  }
): DirectusRequestContext {
  const preview = event
    ? getDirectusPreviewContext(event, options.preview)
    : ({ isPreview: false } satisfies DirectusPreviewContext);

  return {
    preview,
    credential: resolveDirectusCredential({
      previewAccessToken: preview.token,
      sessionAccessToken: options.sessionAccessToken,
      staticToken: options.staticToken
    })
  };
}

/**
 * Resolves request context from the module's server runtime configuration.
 * @param event Optional request event.
 * @returns The request preview context and selected credential.
 */
export function resolveDirectusRuntimeRequestContext(event?: H3Event): DirectusRequestContext {
  const config = useRuntimeConfig(event);
  return resolveDirectusRequestContext(event, {
    preview: config.public.directusClient.preview,
    staticToken: config.directusClient.staticToken
  });
}

/**
 * Builds the only authorization header that can be sent to Directus.
 *
 * @param credential Selected request credential.
 * @returns A header object suitable for H3 or Fetch.
 */
export function getDirectusAuthorizationHeader(
  credential: DirectusCredential
): Record<string, string> {
  return credential.accessToken ? { authorization: `Bearer ${credential.accessToken}` } : {};
}
