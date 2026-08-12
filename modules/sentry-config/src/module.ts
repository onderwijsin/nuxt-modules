import { resolve } from "node:path";
import type { ModuleDependencies } from "@nuxt/schema";

import {
  addServerHandler,
  addServerPlugin,
  addServerTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  extendPages,
  useLogger
} from "@nuxt/kit";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
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
import type { ModuleOptions, SentryTestToolsOptions } from "./config/options.schema";

export type {
  ModuleOptions,
  SentryRuntime,
  SentryTestToolRouteOptions,
  SentryTestToolsOptions
} from "./config/options.schema";

const MODULE_KEY = "sentryConfig";
const MODULE_NAME = resolveModuleName(MODULE_KEY);
const resolver = createResolver(import.meta.url);
const DEFAULT_TEST_PAGE_PATH = "/_sentry";
const DEFAULT_TEST_ENDPOINT_PATH = "/api/_sentry/trigger-error";

interface ResolvedTestTools {
  page: string | false;
  endpoint: string | false;
}

/**
 * Resolves which optional Sentry diagnostics should be registered.
 *
 * @param testTools - Consumer options for the diagnostic page and endpoint.
 * @returns Enabled diagnostic routes, or `false` for opted-out tools.
 */
function resolveTestTools(testTools?: SentryTestToolsOptions | false): ResolvedTestTools {
  if (testTools === false) return { page: false, endpoint: false };

  const page = testTools?.page;
  const endpoint = testTools?.endpoint;

  return {
    page: page === false ? false : (page?.path ?? DEFAULT_TEST_PAGE_PATH),
    endpoint: endpoint === false ? false : (endpoint?.path ?? DEFAULT_TEST_ENDPOINT_PATH)
  };
}

/** Registers runtime-specific Sentry server initialization from one consumer config object. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  moduleDependencies: (nuxt): ModuleDependencies => {
    const configuredOptions = nuxt.options.sentryConfig;
    const testTools =
      configuredOptions === false || configuredOptions?.enabled === false
        ? { page: false, endpoint: false }
        : resolveTestTools(configuredOptions?.testTools);

    return {
      ...(testTools.page === false ? {} : { "@nuxt/ui": { version: "^4.0.0" } }),
      ...(testTools.endpoint === false
        ? {}
        : { "@onderwijsin/nuxt-simple-rate-limiter": { version: "*" } })
    };
  },
  defaults: {
    enabled: true,
    autoInjectServerConfig: true,
    disableNitroSourceMapUpload: true
  },
  setup(rawOptions, nuxt) {
    addTypeTemplate({
      filename: "types/sentry-config.d.ts",
      src: resolver.resolve("./runtime/types/config.d.ts")
    });

    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const options = validateModuleOptions(rawOptions, sentryConfigOptionsSchema, log);
    if (!isEnabled()) return;

    const preset = nuxt.options.nitro.preset ?? process.env.NITRO_PRESET ?? "node-server";
    const runtime = resolveSentryRuntime(options.runtime, preset);
    const configFile = resolveSentryConfigFile(nuxt.options.rootDir, options.configFile);

    const testTools = resolveTestTools(options.testTools);
    nuxt.options.runtimeConfig.public.sentry = {
      ...nuxt.options.runtimeConfig.public.sentry,
      dsn: options.dsn ?? nuxt.options.runtimeConfig.public.sentry?.dsn,
      runtime,
      ...(testTools.endpoint === false ? {} : { testTools: { endpoint: testTools.endpoint } })
    };

    const runtimeDir = resolver.resolve("./runtime");
    if (testTools.endpoint !== false) {
      addServerHandler({
        handler: resolver.resolve(runtimeDir, "server/api/trigger-error.get"),
        route: testTools.endpoint
      });
    }
    const testPage = testTools.page;
    if (testPage !== false) {
      extendPages((pages) => {
        pages.push({
          name: "sentry-config-test-tools",
          path: testPage,
          file: resolver.resolve(runtimeDir, "app/pages/sentry.vue"),
          meta: { robots: "noindex", sitemap: false }
        });
      });
    }
    if (testTools.page !== false || testTools.endpoint !== false)
      transpileRuntime(nuxt, runtimeDir);

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
