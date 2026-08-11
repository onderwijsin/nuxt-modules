import { resolve } from "node:path";

import {
  addServerPlugin,
  addServerTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";

import {
  createSentryPreloadPlugin,
  generateCloudflareSentryPluginSource,
  injectSentryPreloadImport,
  normalizeRollupPlugins,
  resolveSentryConfigFile,
  resolveSentryRuntime,
  stripSentryNitroRollupPlugin
} from "./config/runtime";
import { sentryConfigOptionsSchema } from "./config/options.schema";
import { version } from "../package.json";
import type { ModuleOptions } from "./types/options";

export type { ModuleOptions, SentryRuntime } from "./types/options";

const MODULE_KEY = "sentryConfig";
const MODULE_NAME = resolveModuleName(MODULE_KEY);
const resolver = createResolver(import.meta.url);

/** Registers runtime-specific Sentry server initialization from one consumer config object. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: {
    enabled: true,
    autoInjectServerConfig: true,
    disableNitroSourceMapUpload: true
  },
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const options = validateModuleOptions(rawOptions, sentryConfigOptionsSchema, log);
    if (!isEnabled()) return;

    const preset = nuxt.options.nitro.preset ?? process.env.NITRO_PRESET ?? "node-server";
    const runtime = resolveSentryRuntime(options.runtime, preset);
    const configFile = resolveSentryConfigFile(nuxt.options.rootDir, options.configFile);

    addTypeTemplate({
      filename: "types/sentry-config.d.ts",
      src: resolver.resolve("./runtime/types/config.d.ts")
    });
    nuxt.options.runtimeConfig.public.sentry = {
      ...nuxt.options.runtimeConfig.public.sentry,
      dsn: options.dsn ?? nuxt.options.runtimeConfig.public.sentry?.dsn,
      runtime
    };

    if (runtime === "cloudflare_module") {
      nuxt.options.nitro.cloudflare ??= {};
      nuxt.options.nitro.cloudflare.nodeCompat ??= true;
      nuxt.hook("nitro:config", (config) => {
        config.cloudflare ??= {};
        config.cloudflare.nodeCompat ??= true;
      });
      addServerTemplate({
        filename: "#sentry-config/cloudflare-config.mjs",
        getContents: () => generateCloudflareSentryPluginSource(configFile)
      });
      addServerPlugin(resolver.resolve("./runtime/server/plugins/cloudflare"));
      log.info("Registered Sentry through the Cloudflare Nitro plugin.");
    } else {
      nuxt.hook("nitro:init", (nitro) => {
        const rollupConfig = nitro.options.rollupConfig ?? { output: {} };
        nitro.options.rollupConfig = rollupConfig;
        const plugins = options.disableNitroSourceMapUpload
          ? stripSentryNitroRollupPlugin(rollupConfig.plugins)
          : normalizeRollupPlugins(rollupConfig.plugins);
        plugins.push(createSentryPreloadPlugin(configFile));
        rollupConfig.plugins = plugins;

        if (options.autoInjectServerConfig) {
          nitro.hooks.hook("compiled", async () => {
            const serverDir = resolve(nuxt.options.rootDir, nitro.options.output.serverDir);
            await injectSentryPreloadImport(resolve(serverDir, "index.mjs"));
          });
        }
      });
      log.info("Registered the Node Sentry preload configuration.");
    }

    if (options.disableNitroSourceMapUpload) {
      nuxt.hook("nitro:init", (nitro) => {
        nitro.hooks.hook("rollup:before", (_nitro, rollupConfig) => {
          rollupConfig.plugins = stripSentryNitroRollupPlugin(rollupConfig.plugins);
        });
      });
    }

    end();
  }
});
