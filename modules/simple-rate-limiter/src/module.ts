import { defineNuxtModule } from "@nuxt/kit";

import { version } from "../package.json";

/** Provides the server-side simple rate limiter runtime export. */
export default defineNuxtModule({
  meta: {
    name: "@onderwijsin/nuxt-simple-rate-limiter",
    configKey: "simpleRateLimiter",
    version,
    compatibility: { nuxt: "^4.0.0" }
  }
});
