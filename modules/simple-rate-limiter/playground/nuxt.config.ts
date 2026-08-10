import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-simple-rate-limiter"],
  appConfig: { packageName },
  simpleRateLimiter: {
    global: {
      enabled: true,
      pruning: {
        enabled: true,
        staleAfter: 5
      }
    }
  },
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      "*/10 * * * * *": ["simple-rate-limiter:prune"]
    }
  }
});
