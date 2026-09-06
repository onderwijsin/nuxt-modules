import type { H3Event } from "h3";

import type { DirectusSessionSnapshot } from "../types";

/**
 * Reads the current token-free Directus session snapshot from the local sealed session.
 * This operation does not refresh an expiring access token.
 *
 * @param event The current request event containing the Directus session cookie.
 * @returns The current session snapshot, or `null` when the request is unauthenticated.
 */
export async function useDirectusServerAuth(
  event: H3Event
): Promise<DirectusSessionSnapshot | null> {
  return (await event.context.directusAuth?.snapshot()) ?? null;
}
