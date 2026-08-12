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
import { isArray, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

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
    collections: { collections: [] },
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
    const serverConfigTypes = addTypeTemplate(
      {
        filename: "types/directus-sitemaps-config.d.ts",
        src: resolver.resolve(runtimeDir, "types/config.d.ts")
      },
      { nitro: true, nuxt: true }
    );
    nuxt.options.typescript.tsConfig ??= {};
    nuxt.options.typescript.tsConfig.compilerOptions ??= {};
    nuxt.options.typescript.tsConfig.compilerOptions.paths ??= {};
    nuxt.options.typescript.tsConfig.compilerOptions.paths["#directus-sitemaps-config"] = [
      serverConfigTypes.dst
    ];
    if (!isEnabled()) return;

    addServerTemplate({
      filename: "#directus-sitemaps-config",
      getContents: () =>
        generateDirectusSitemapsConfigSource(options.sitemaps.static, sharedConfig !== undefined)
    });
    const sitemap = Reflect.get(nuxt.options, "sitemap");
    const sitemapNames = resolveSitemapNames(options);
    if (sitemap === false) {
      log.warn("@nuxtjs/sitemap is disabled; no Directus sitemap source was registered.");
    } else if (isRecord(sitemap)) {
      if (sitemapNames.length > 0) {
        registerNamedSitemaps(sitemap, sitemapNames, options.sitemaps.apiEndpoint);
      } else {
        const sources = Reflect.get(sitemap, "sources");
        Reflect.set(sitemap, "sources", [
          ...createSitemapSource(options.sitemaps.apiEndpoint),
          ...(isArray(sources) ? sources : [])
        ]);
      }
    } else {
      Reflect.set(nuxt.options, "sitemap", {
        ...(sitemapNames.length > 0
          ? {
              sitemaps: Object.fromEntries(
                sitemapNames.map((name) => [
                  name,
                  { sources: createSitemapSource(options.sitemaps.apiEndpoint) }
                ])
              )
            }
          : { sources: createSitemapSource(options.sitemaps.apiEndpoint) })
      });
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
        route: "/sitemap",
        handler: resolver.resolve(runtimeDir, "server/routes/pretty.get")
      });
    }
    nuxt.options.routeRules ??= {};
    nuxt.options.routeRules[options.sitemaps.apiEndpoint] = {
      ...nuxt.options.routeRules[options.sitemaps.apiEndpoint],
      cache: options.sitemaps.cache || false,
      prerender: options.sitemaps.prerenderSitemaps
    };
    if (options.sitemaps.prerenderSitemaps) {
      addPrerenderRoutes([
        options.sitemaps.apiEndpoint,
        ...(sitemapNames.length > 0
          ? ["/sitemap_index.xml", ...resolveNamedSitemapRoutes(sitemap, sitemapNames)]
          : ["/sitemap.xml"])
      ]);
    }
    end();
  }
});

function resolveSitemapNames(options: ModuleOptions): string[] {
  const names = new Set<string>();
  for (const collection of options.collections?.collections ?? []) {
    if (collection.sitemap !== false && collection.sitemap._sitemap) {
      names.add(collection.sitemap._sitemap);
    }
  }
  for (const entry of options.sitemaps?.static ?? []) {
    if (!isRecord(entry)) continue;
    const sitemapName = Reflect.get(entry, "_sitemap");
    if (isString(sitemapName) && sitemapName.trim()) names.add(sitemapName);
  }
  return [...names];
}

function registerNamedSitemaps(sitemap: object, sitemapNames: string[], source: string): void {
  if (sitemapNames.length === 0) return;
  const current = Reflect.get(sitemap, "sitemaps");
  const currentSitemaps = isRecord(current) ? current : {};
  const namedSitemaps = Object.fromEntries(
    sitemapNames.map((name) => {
      const currentSitemap = Reflect.get(currentSitemaps, name);
      const sources = isRecord(currentSitemap) ? Reflect.get(currentSitemap, "sources") : undefined;
      return [name, { sources: [source, ...(isArray(sources) ? sources : [])] }];
    })
  );
  Reflect.set(sitemap, "sitemaps", defu(namedSitemaps, currentSitemaps));
}

function resolveNamedSitemapRoutes(sitemap: unknown, sitemapNames: string[]): string[] {
  const prefix = isRecord(sitemap) ? Reflect.get(sitemap, "sitemapsPathPrefix") : undefined;
  const pathPrefix = isString(prefix) ? prefix.replace(/\/$/u, "") : "/__sitemap__";
  return sitemapNames.map((name) => `${pathPrefix}/${name}.xml`);
}
