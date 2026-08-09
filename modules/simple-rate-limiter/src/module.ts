import { addServerImports, createResolver, defineNuxtModule } from "@nuxt/kit";

import { simpleRateLimiterOptionsSchema } from "./config/options.schema";
import { version } from "../package.json";
import type { ModuleOptions } from "./types/options";

const DEFAULTS = {
  global: {
    enabled: false,
    pruning: {
      enabled: false,
      staleAfter: 24 * 60 * 60
    }
  }
} satisfies Required<ModuleOptions>;

/** Registers the server-only rate limiter auto-import. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@onderwijsin/nuxt-simple-rate-limiter",
    configKey: "simpleRateLimiter",
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: DEFAULTS,
  setup(rawOptions, nuxt) {
    const options = simpleRateLimiterOptionsSchema.parse(rawOptions);
    const resolver = createResolver(import.meta.url);

    nuxt.options.runtimeConfig = {
      ...nuxt.options.runtimeConfig,
      simpleRateLimiter: { global: options.global }
    };

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
