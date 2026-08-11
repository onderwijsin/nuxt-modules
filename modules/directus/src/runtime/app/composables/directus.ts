import type { RestCommand } from "@directus/sdk";
import type { Schema } from "#directus";
import { useNuxtApp } from "#app";

/**
 * Runs a Directus REST command from a Nuxt component or composable.
 *
 * Pass a command from `@directus/sdk`, such as `readItems("articles", { limit: 10 })`. In the
 * browser, the request is sent through the module's same-origin proxy; during server rendering,
 * it is sent directly to Directus. Credentials are selected by the module and are not exposed to
 * the caller.
 *
 * @param command A Directus SDK REST command, for example `readItems("articles")`.
 * @returns A promise containing the command result, typed from the supplied command.
 */
export function useDirectus<Output>(command: RestCommand<Output, Schema>): Promise<Output> {
  return useNuxtApp().$directus?.request(command);
}
