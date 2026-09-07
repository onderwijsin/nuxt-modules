import { defineNuxtPlugin, useRequestEvent } from "#app";
import { resolveDirectusUser } from "../server/resolve-user";

/**
 * Provides the direct outer-request resolver for SSR current-user hydration.
 * @returns Nuxt plugin setup with the request-local user resolver.
 */
export default defineNuxtPlugin(() => {
  const event = useRequestEvent();
  if (!event) throw new Error("Directus current-user SSR plugin requires an H3 event.");
  return { provide: { directusUser: () => resolveDirectusUser(event) } };
});
