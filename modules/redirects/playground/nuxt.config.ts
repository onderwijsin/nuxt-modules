import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-redirects"],
  redirects: {
    serverMiddleware: true,
    store: true,
    routeMiddleware: true,
    dynamicMatching: true,
    storeRefreshInterval: 5
  },
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      // Refresh every 10 seconds
      "*/10 * * * * *": ["redirects:refresh"]
    }
  },
  appConfig: {
    packageName
  }
});
