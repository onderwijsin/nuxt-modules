import { clearNuxtData, defineNuxtPlugin, refreshNuxtData } from "#app";
import { ofetch } from "ofetch";

/**
 * Provides browser transport for the current-user route.
 * @param nuxtApp Active Nuxt application.
 * @returns Nuxt plugin setup with browser transport and lifecycle hooks.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const hasUserData = () => nuxtApp.payload.data["directus:user"] !== undefined;
  nuxtApp.hook("directus:auth:login", async () => {
    if (hasUserData()) await refreshNuxtData("directus:user");
  });
  const clearUserData = () => {
    if (hasUserData()) clearNuxtData("directus:user");
  };
  nuxtApp.hook("directus:auth:logout", clearUserData);
  nuxtApp.hook("directus:auth:invalidated", clearUserData);
  return {
    provide: {
      directusUser: () => ofetch("/_directus/auth/user", { credentials: "same-origin" })
    }
  };
});
