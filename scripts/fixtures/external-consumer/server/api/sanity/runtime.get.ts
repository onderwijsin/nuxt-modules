import { defineEventHandler } from "h3";
import {
  getCacheIndexKey,
  getCacheMetadataKey,
  normalizeCacheBase
} from "@onderwijsin/nuxt-cache/runtime";
import { defineHealthcheckComponent } from "@onderwijsin/nuxt-healthcheck/runtime";
import { enforceRateLimit } from "@onderwijsin/nuxt-simple-rate-limiter/runtime";
import * as rateLimitPruneTask from "@onderwijsin/nuxt-simple-rate-limiter/runtime/prune-task";
import * as newsletterServer from "@onderwijsin/nuxt-newsletter-signup/runtime/server";
import { defineRedirectSource } from "@onderwijsin/nuxt-redirects/runtime/source";
import * as redirectsRefreshTask from "@onderwijsin/nuxt-redirects/runtime/refresh-task";
import {
  TURNSTILE_TOKEN_HEADER,
  createTurnstileErrorData
} from "@onderwijsin/nuxt-turnstile/runtime";
import { resolveModuleName } from "@onderwijsin/nuxt-module-utils/build";
import * as appUtils from "@onderwijsin/nuxt-module-utils/app";
import * as serverUtils from "@onderwijsin/nuxt-module-utils/server";
import * as typeExports from "@onderwijsin/nuxt-module-utils/types";

/**
 * Exercises framework-neutral and server runtime exports without external services.
 *
 * @param event - Incoming request used by the local rate-limit check.
 * @returns A summary of the runtime export checks.
 */
export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, { max: 5, duration: 60, ban: 0 });

  const healthcheck = defineHealthcheckComponent({ handler: async () => ({ status: "ok" }) });
  const turnstileError = createTurnstileErrorData("TURNSTILE_TOKEN_MISSING");

  return {
    cache: {
      base: normalizeCacheBase("sanity:check"),
      metadata: getCacheMetadataKey("sanity:check:item"),
      index: getCacheIndexKey("sanity:check", "/", "sanity:check:item")
    },
    healthcheck: typeof healthcheck.handler === "function",
    turnstile: {
      header: TURNSTILE_TOKEN_HEADER,
      code: turnstileError.code
    },
    moduleUtils: {
      name: resolveModuleName("externalConsumer"),
      app: Object.keys(appUtils).length === 0,
      server: Object.keys(serverUtils).includes("assertAdminAccess"),
      types: Object.keys(typeExports).length === 0
    },
    publicSubpaths: {
      newsletterServer: Object.keys(newsletterServer).includes("getErrorStatus"),
      rateLimitPruneTask: typeof rateLimitPruneTask.default === "object",
      redirectsSource: typeof defineRedirectSource === "function",
      redirectsRefreshTask: typeof redirectsRefreshTask.default === "object"
    }
  };
});
