import { addServerImports, createResolver, defineNuxtModule } from "@nuxt/kit";

import { version } from "../package.json";

interface ModuleOptions {}

/** Registers the server-only rate limiter auto-import. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@onderwijsin/nuxt-simple-rate-limiter",
    configKey: "simpleRateLimiter",
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  setup() {
    const resolver = createResolver(import.meta.url);

    addServerImports({
      name: "enforceRateLimit",
      from: resolver.resolve("./runtime")
    });
    addServerImports({
      name: "enforceGlobalRateLimit",
      from: resolver.resolve("./runtime")
    });
  }
});
