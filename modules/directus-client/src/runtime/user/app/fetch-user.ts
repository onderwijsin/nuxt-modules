import { useRequestEvent, useRequestFetch } from "#app";
import { appendResponseHeader } from "h3";

/**
 * Fetches the current-user route and preserves rotated session cookies during SSR.
 * @returns The current-user response payload.
 */
export async function fetchDirectusUser(): Promise<Record<string, unknown> | null> {
  const event = useRequestEvent();
  return useRequestFetch()("/_directus/auth/user", {
    onResponse({ response }) {
      if (!event) return;

      const cookies = response.headers.getSetCookie?.() ?? response.headers.get("set-cookie");
      for (const cookie of cookies ? (Array.isArray(cookies) ? cookies : [cookies]) : []) {
        appendResponseHeader(event, "set-cookie", cookie);
      }
    }
  }) as Promise<Record<string, unknown> | null>;
}
