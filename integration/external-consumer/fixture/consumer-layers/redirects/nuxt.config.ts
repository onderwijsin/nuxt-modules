export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-redirects"],
  redirects: {
    enabled: true,
    serverMiddleware: false,
    store: true,
    routeMiddleware: true,
    storageMount: "externalRedirects"
  }
});
