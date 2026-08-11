import {
  addPrerenderRoutes,
  addServerHandler,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import { defu } from "defu";
import {
  moduleDependenciesWhenEnabled,
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";

import { directusSitemapsOptionsSchema } from "./config/options.schema";
import type { ModuleOptions } from "./types/options";
import { createSitemapSources, getSitemapKeys } from "./utils/sitemaps";
import { version } from "../package.json";

const MODULE_KEY = "directusSitemaps";
const MODULE_NAME = resolveModuleName("directus-sitemaps");

/** Registers Directus-backed sources for @nuxtjs/sitemap. */
export default defineNuxtModule<ModuleOptions>({
  meta: { name: MODULE_NAME, configKey: MODULE_KEY, version, compatibility: { nuxt: "^4.0.0" } },
  defaults: {
    enabled: true,
    collections: [],
    static: [],
    apiEndpoint: "/api/_directus-sitemaps/urls",
    enablePrettyUrls: true,
    cache: { maxAge: 300, staleMaxAge: 0, swr: true },
    prerender: false
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
    const options = validateModuleOptions(rawOptions, directusSitemapsOptionsSchema, log);
    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");
    addTypeTemplate({
      filename: "types/directus-sitemaps-config.d.ts",
      src: resolver.resolve(runtimeDir, "types/config.d.ts")
    });
    if (!isEnabled()) return;

    const keys = getSitemapKeys(options.collections, options.static);
    nuxt.options.runtimeConfig.directusSitemaps = defu(
      { collections: options.collections, static: options.static },
      nuxt.options.runtimeConfig.directusSitemaps
    );
    nuxt.options.sitemap = defu(
      { sitemaps: createSitemapSources(keys, options.apiEndpoint) },
      nuxt.options.sitemap
    );
    transpileRuntime(nuxt, runtimeDir);
    addServerHandler({
      method: "get",
      route: options.apiEndpoint,
      handler: resolver.resolve(runtimeDir, "server/routes/urls.get")
    });
    if (options.enablePrettyUrls) {
      addServerHandler({
        method: "get",
        route: "/sitemap/**",
        handler: resolver.resolve(runtimeDir, "server/routes/pretty.get")
      });
    }
    nuxt.options.routeRules ??= {};
    nuxt.options.routeRules[options.apiEndpoint] = {
      ...nuxt.options.routeRules[options.apiEndpoint],
      cache: options.cache || false,
      prerender: options.prerender
    };
    if (options.prerender)
      addPrerenderRoutes([
        options.apiEndpoint,
        "/sitemap_index.xml",
        ...keys.map((key) => `/${key}-sitemap.xml`)
      ]);
    end();
  }
});
