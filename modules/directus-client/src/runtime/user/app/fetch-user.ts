import { useRequestEvent, useRequestFetch } from "#app";
import { appendResponseHeader } from "h3";
import type { DirectusUser } from "@directus/sdk";
import type { Schema } from "#directus";

type DirectusUserData = DirectusUser<Schema> | Record<string, unknown> | null;

/**
 * Fetches the current-user route and preserves rotated session cookies during SSR.
 * @returns The current-user response payload.
 */
export async function fetchDirectusUser(): Promise<DirectusUserData> {
  const requestFetch = useRequestFetch();
  if (!("raw" in requestFetch)) return requestFetch<DirectusUserData>("/_directus/auth/user");

  const response = await requestFetch.raw<DirectusUserData>("/_directus/auth/user");
  const event = useRequestEvent();

  if (event) {
    const cookies = response.headers.getSetCookie?.() ?? response.headers.get("set-cookie");
    for (const cookie of cookies ? (Array.isArray(cookies) ? cookies : [cookies]) : []) {
      appendResponseHeader(event, "set-cookie", cookie);
    }
  }

  return response._data ?? null;
}
