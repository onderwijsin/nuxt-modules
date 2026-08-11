import {
  addPrerenderRoutes,
  addServerHandler,
  addServerTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import { defu } from "defu";
import { getResolvedDirectusConfig } from "@onderwijsin/nuxt-directus-config/schema";
import {
  moduleDependenciesWhenEnabled,
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";

import { directusSitemapsOptionsSchema } from "./config/options.schema";
import { generateDirectusSitemapsConfigSource } from "./config/source";
import type { ModuleOptions } from "./types/options";
import { createSitemapSource } from "./utils/sitemaps";
import { version } from "../package.json";

const MODULE_KEY = "directusSitemaps";
const MODULE_NAME = resolveModuleName("directus-sitemaps");

/** Registers Directus-backed sources for @nuxtjs/sitemap. */
export default defineNuxtModule<ModuleOptions>({
  meta: { name: MODULE_NAME, configKey: MODULE_KEY, version, compatibility: { nuxt: "^4.0.0" } },
  defaults: {
    enabled: true,
    collections: {},
    sitemaps: {}
  },
  moduleDependencies: (nuxt): ModuleDependencies =>
    moduleDependenciesWhenEnabled(nuxt.options.directusSitemaps, {
      "@onderwijsin/nuxt-directus": { version: ">=0.2.0" },
      "@nuxtjs/sitemap": { version: ">=8.0.0" }
    }),
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();
    const sharedConfig = getResolvedDirectusConfig(nuxt);
    const options = validateModuleOptions(
      defu(rawOptions, {
        collections: sharedConfig?.collections,
        sitemaps: sharedConfig?.sitemaps
      }),
      directusSitemapsOptionsSchema,
      log
    );
    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");
    addTypeTemplate({
      filename: "types/directus-sitemaps-config.d.ts",
      src: resolver.resolve(runtimeDir, "types/config.d.ts")
    });
    if (!isEnabled()) return;

    addServerTemplate({
      filename: "#directus-sitemaps-config",
      getContents: () =>
        generateDirectusSitemapsConfigSource(options.sitemaps.static, sharedConfig !== undefined)
    });
    if (nuxt.options.sitemap !== false) {
      nuxt.options.sitemap.sources = [
        ...createSitemapSource(options.sitemaps.apiEndpoint),
        ...nuxt.options.sitemap.sources
      ];
    } else {
      log.warn("@nuxtjs/sitemap is disabled; no Directus sitemap source was registered.");
    }
    transpileRuntime(nuxt, runtimeDir);
    addServerHandler({
      method: "get",
      route: options.sitemaps.apiEndpoint,
      handler: resolver.resolve(runtimeDir, "server/routes/urls.get")
    });
    if (options.sitemaps.enablePrettyUrls) {
      addServerHandler({
        method: "get",
        route: "/sitemap/**",
        handler: resolver.resolve(runtimeDir, "server/routes/pretty.get")
      });
    }
    nuxt.options.routeRules ??= {};
    nuxt.options.routeRules[options.sitemaps.apiEndpoint] = {
      ...nuxt.options.routeRules[options.sitemaps.apiEndpoint],
      cache: options.sitemaps.cache || false,
      prerender: options.sitemaps.prerenderSitemaps
    };
    if (options.sitemaps.prerenderSitemaps)
      addPrerenderRoutes([options.sitemaps.apiEndpoint, "/sitemap.xml", "/sitemap_index.xml"]);
    end();
  }
});
