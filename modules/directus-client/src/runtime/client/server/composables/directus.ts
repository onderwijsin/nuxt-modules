import type { RestCommand } from "@directus/sdk";
import type { H3Event } from "h3";
import type { Schema } from "#directus";

import { createServerDirectusClient } from "../client";

/**
 * Runs a Directus REST command in Nitro server code.
 *
 * Use this in a server route, server utility, or task when the request must go directly to
 * Directus rather than through the browser proxy. The module selects server-side credentials and
 * the command's result keeps the type inferred by `@directus/sdk`.
 *
 * @param command A Directus SDK REST command, for example `readItems("articles")`.
 * @param event The current request event when request-specific configuration is required.
 * @returns A promise containing the command result, typed from the supplied command.
 */
export function useDirectusServer<Output>(
  command: RestCommand<Output, Schema>,
  event?: H3Event
): Promise<Output> {
  const client = createServerDirectusClient(event);
  return client.request(command);
}
