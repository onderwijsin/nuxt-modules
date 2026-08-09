import { addServerImports, addTemplate, createResolver, defineNuxtModule } from "@nuxt/kit";
import type { NitroConfig } from "nitropack/types";

import { simpleRateLimiterOptionsSchema } from "./config/options.schema";
import { version } from "../package.json";
import type { ModuleOptions } from "./types/options";

declare module "@nuxt/schema" {
  interface NuxtHooks {
    "nitro:config": (config: NitroConfig) => void;
  }
}

const DEFAULTS = {
  global: {
    enabled: false,
    pruning: {
      enabled: false,
      cron: "0 * * * *",
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
    const runtimeDir = resolver.resolve("./runtime");

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

    if (options.global?.enabled !== true || options.global.pruning?.enabled !== true) return;

    const task = addTemplate({
      filename: "tasks/simple-rate-limiter-prune.mjs",
      write: true,
      getContents: () =>
        `export { default } from ${JSON.stringify(resolver.resolve(runtimeDir, "tasks/prune"))};\n`
    });

    nuxt.hook("nitro:config", (nitroConfig) => {
      nitroConfig.experimental ??= {};
      nitroConfig.tasks ??= {};
      nitroConfig.scheduledTasks ??= {};
      nitroConfig.experimental.tasks = true;
      nitroConfig.tasks["simple-rate-limiter:prune"] = {
        handler: task.dst,
        description: "Remove stale global simple rate limiter records."
      };
      const cron = options.global?.pruning?.cron ?? "0 * * * *";
      nitroConfig.scheduledTasks[cron] = [
        ...(nitroConfig.scheduledTasks[cron] ?? []),
        "simple-rate-limiter:prune"
      ];
    });
  }
});
