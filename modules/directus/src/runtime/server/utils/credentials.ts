/** A server-side credential selected for one Directus request. */
export interface DirectusCredential {
  readonly accessToken?: string;
  readonly source: "session" | "static" | "none";
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
  readonly sessionAccessToken?: string;
  readonly staticToken?: string;
}): DirectusCredential {
  if (options.sessionAccessToken) {
    return { accessToken: options.sessionAccessToken, source: "session" };
  }

  if (options.staticToken) {
    return { accessToken: options.staticToken, source: "static" };
  }

  return { source: "none" };
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
