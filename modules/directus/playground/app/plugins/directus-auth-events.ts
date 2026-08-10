import { defineNuxtPlugin } from "#app";

/**
 * Logs Directus authentication lifecycle hooks for playground verification.
 * @param nuxtApp The active Nuxt application instance.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("directus:auth:login", (payload) => {
    console.log("[directus auth event] directus:auth:login", payload);
  });

  nuxtApp.hook("directus:auth:refresh", (payload) => {
    console.log("[directus auth event] directus:auth:refresh", payload);
  });

  nuxtApp.hook("directus:auth:logout", (payload) => {
    console.log("[directus auth event] directus:auth:logout", payload);
  });

  nuxtApp.hook("directus:auth:invalidated", (payload) => {
    console.log("[directus auth event] directus:auth:invalidated", payload);
  });
});
