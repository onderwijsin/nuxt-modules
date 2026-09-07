import { clearNuxtData, defineNuxtPlugin, refreshNuxtData } from "#app";
import { ofetch } from "ofetch";

/**
 * Provides browser transport for the current-user route.
 * @param nuxtApp Active Nuxt application.
 * @returns Nuxt plugin setup with browser transport and lifecycle hooks.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("directus:auth:login", () => refreshNuxtData("directus:user"));
  nuxtApp.hook("directus:auth:logout", () => clearNuxtData("directus:user"));
  nuxtApp.hook("directus:auth:invalidated", () => clearNuxtData("directus:user"));
  return {
    provide: {
      directusUser: () => ofetch("/_directus/auth/user", { credentials: "same-origin" })
    }
  };
});
