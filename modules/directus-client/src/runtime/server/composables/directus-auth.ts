import type { H3Event } from "h3";

import type { DirectusSessionSnapshot } from "../utils/session";
import { readDirectusSessionSnapshot } from "../utils/auth";

/**
 * Reads the current token-free Directus session from a Nitro request.
 *
 * @param event The current request event containing the Directus session cookie.
 * @returns The current session snapshot, or `null` when the request is unauthenticated.
 */
export function useDirectusServerAuth(event: H3Event): Promise<DirectusSessionSnapshot | null> {
  return readDirectusSessionSnapshot(event);
}
