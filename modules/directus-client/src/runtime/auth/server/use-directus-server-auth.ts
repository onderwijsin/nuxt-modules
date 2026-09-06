import type { H3Event } from "h3";

import type { DirectusSessionSnapshot } from "../types";

/**
 * Resolves the current token-free Directus session snapshot for a server request.
 * Authentication is refreshed when the current access token is not usable.
 *
 * @param event The current request event containing the Directus session cookie.
 * @returns The current session snapshot, or `null` when the request is unauthenticated.
 */
export async function useDirectusServerAuth(
  event: H3Event
): Promise<DirectusSessionSnapshot | null> {
  return (await event.context.directusAuth?.resolve())?.snapshot ?? null;
}
