import type { H3Event } from "h3";
import { useRuntimeConfig } from "#imports";

/**
 * Reads runtime configuration from the current Nitro request context.
 *
 * The request context is populated by Nitro during server requests and by the Directus server
 * plugin before request-bound authentication operations are exposed. The Nuxt fallback keeps the
 * utility usable from ordinary server handlers and isolated tests.
 *
 * @param event - Incoming application request event.
 * @returns The request runtime configuration.
 */
export function getDirectusRuntimeConfig(event: H3Event) {
  return event.context?.nitro?.runtimeConfig ?? useRuntimeConfig(event);
}
