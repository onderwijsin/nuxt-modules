import { defineNuxtPlugin, useRequestEvent, useState } from "#app";

import { createServerDirectusClient } from "../../client/server/create-client";
import { isTransientDirectusRefreshError } from "../server/refresh";
import { getDirectusSessionSnapshot } from "../server/session";
import type { DirectusSessionSnapshot } from "../types";

/**
 * Installs a request-scoped Directus client and exposes the safe session snapshot during SSR.
 *
 * This plugin is registered only when cookie authentication is enabled so applications that use
 * static, preview, or unauthenticated access do not read or serialize session cookies.
 *
 * @returns The injected request-scoped client.
 */
export default defineNuxtPlugin(async () => {
  const event = useRequestEvent();
  const session = useState<DirectusSessionSnapshot | null>("directus:session", () => null);
  if (event) {
    try {
      const authState = await event.context.directusAuth?.resolve();
      session.value = authState?.snapshot ?? null;
    } catch (error) {
      if (!isTransientDirectusRefreshError(error)) throw error;
      session.value = await getDirectusSessionSnapshot(event);
    }
  }

  return {
    provide: {
      directus: createServerDirectusClient(event)
    }
  };
});
