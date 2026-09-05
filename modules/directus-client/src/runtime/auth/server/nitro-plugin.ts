import { defineNitroPlugin } from "nitropack/runtime";

import type { DirectusRequestAuthState } from "../types";
import { ensureFreshDirectusSession } from "./refresh";

/**
 * Attaches a lazy Nitro-owned authentication resolver to the current request for Nuxt consumers.
 * @param nitroApp Nitro application instance.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    let pending: Promise<DirectusRequestAuthState> | undefined;
    event.context.directusAuth = {
      resolve() {
        return (pending ??= ensureFreshDirectusSession(event).then((session) => ({
          accessToken: session?.accessToken,
          snapshot: session?.snapshot ?? null
        })));
      }
    };
  });
});
