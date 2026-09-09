import { useRequestEvent, useRequestFetch } from "#app";
import { appendResponseHeader } from "h3";
import { isArray } from "@onderwijsin/nuxt-module-utils";
import type { DirectusUserResponse } from "#directus-user";

/**
 * Fetches the current-user route and preserves rotated session cookies during SSR.
 * @returns The current-user response payload.
 */
export async function fetchDirectusUser(): Promise<DirectusUserResponse | null> {
  const event = useRequestEvent();
  const fetch = useRequestFetch();
  return fetch<DirectusUserResponse | null>("/_directus/auth/user", {
    onResponse({ response }) {
      if (!event) return;

      const cookies = response.headers.getSetCookie?.() ?? response.headers.get("set-cookie");
      for (const cookie of cookies ? (isArray(cookies) ? cookies : [cookies]) : []) {
        appendResponseHeader(event, "set-cookie", cookie);
      }
    }
  });
}
