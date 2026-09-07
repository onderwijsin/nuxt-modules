import { defineNitroPlugin } from "nitropack/runtime";

import type { DirectusRequestAuthState } from "../types";
import { ensureFreshDirectusSession, isTransientDirectusRefreshError } from "./refresh";
import { getDirectusSessionSnapshot } from "./session";

/**
 * Attaches a lazy Nitro-owned authentication resolver to the current request for Nuxt consumers.
 * @param nitroApp Nitro application instance.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    let pending: Promise<DirectusRequestAuthState> | undefined;
    let pendingSnapshot: Promise<DirectusRequestAuthState["snapshot"]> | undefined;
    const resolve = (): Promise<DirectusRequestAuthState> =>
      (pending ??= ensureFreshDirectusSession(event).then((session) => ({
        accessToken: session?.accessToken,
        snapshot: session?.snapshot ?? null
      })));
    event.context.directusAuth = {
      resolve,
      async resolveSnapshot() {
        try {
          return (await resolve()).snapshot;
        } catch (error) {
          if (!isTransientDirectusRefreshError(error)) throw error;
          return (pendingSnapshot ??= getDirectusSessionSnapshot(event));
        }
      }
    };
  });
});
