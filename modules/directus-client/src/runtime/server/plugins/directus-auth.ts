import { defineNitroPlugin } from "nitropack/runtime";

import { ensureFreshDirectusSession } from "../utils/auth";

/**
 * Projects Nitro-owned authentication state onto the current request for Nuxt consumers.
 * @param nitroApp Nitro application instance.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", async (event) => {
    const session = await ensureFreshDirectusSession(event);
    event.context.directusAuth = {
      accessToken: session?.accessToken,
      snapshot: session?.snapshot ?? null
    };
  });
});
