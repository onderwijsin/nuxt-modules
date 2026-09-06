import { defineNitroPlugin } from "nitropack/runtime";

import type { DirectusRequestAuthState } from "../types";
import { ensureFreshDirectusSession } from "./refresh";
import { getDirectusSessionSnapshot } from "./session";

/**
 * Attaches a lazy Nitro-owned authentication resolver to the current request for Nuxt consumers.
 * @param nitroApp Nitro application instance.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    let pending: Promise<DirectusRequestAuthState> | undefined;
    let pendingSnapshot: Promise<DirectusRequestAuthState["snapshot"]> | undefined;
    event.context.directusAuth = {
      snapshot() {
        return (pendingSnapshot ??= getDirectusSessionSnapshot(event));
      },
      resolve() {
        return (pending ??= ensureFreshDirectusSession(event).then((session) => ({
          accessToken: session?.accessToken,
          snapshot: session?.snapshot ?? null
        })));
      }
    };
  });
});
