import { clearNuxtData, defineNuxtPlugin, refreshNuxtData } from "#app";

/**
 * Synchronizes current-user async data with authentication lifecycle events.
 * @param nuxtApp Active Nuxt application.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("directus:auth:login", () => refreshNuxtData("directus:user"));
  nuxtApp.hook("directus:auth:logout", () => clearNuxtData("directus:user"));
  nuxtApp.hook("directus:auth:invalidated", () => clearNuxtData("directus:user"));
});
