import type { H3Event } from "h3";

import type { DirectusSessionSnapshot } from "../types";

/**
 * Reads the current token-free Directus session from a Nitro request after refreshing an expiring
 * access token when possible.
 *
 * @param event The current request event containing the Directus session cookie.
 * @returns The current session snapshot, or `null` when the request is unauthenticated.
 */
export async function useDirectusServerAuth(
  event: H3Event
): Promise<DirectusSessionSnapshot | null> {
  return (await event.context.directusAuth?.resolve())?.snapshot ?? null;
}
