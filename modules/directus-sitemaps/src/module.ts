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
import {
  isArray,
  isDefined,
  isNonBlankString,
  hasKey,
  isRecord
} from "@onderwijsin/nuxt-module-utils/shared";

import { directusSitemapsOptionsSchema } from "./config/options.schema";
import {
  generateDirectusSitemapsConfigSource,
  mergeDirectusSitemapCollections
} from "./config/source";
import type { ModuleOptions } from "./types/options";
import {
  set,
  get,
  resolveSitemapNamespaces,
  registerSitemapNamespaces,
  resolveNamespacedSitemapRoute
} from "./utils/helpers";
import { version } from "../package.json";

const MODULE_KEY = "directusSitemaps";
const MODULE_NAME = resolveModuleName("directus-sitemaps");

/** Registers Directus-backed sources for @nuxtjs/sitemap. */
export default defineNuxtModule<ModuleOptions>({
  meta: { name: MODULE_NAME, configKey: MODULE_KEY, version, compatibility: { nuxt: "^4.0.0" } },
  defaults: {
    enabled: true,
    collections: []
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
    // Only merge general sitemap config from shared config into module options. Collections will be handled seperately
    const options = validateModuleOptions(
      defu(rawOptions, {
        ...(sharedConfig?.sitemaps ?? {})
      }),
      directusSitemapsOptionsSchema,
      log
    );

    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    // TODO this type template { nitro: true, nuxt: true }. Thats not an established pattern,
    // and i dont know what it does
    const serverConfigTypes = addTypeTemplate(
      {
        filename: "types/directus-sitemaps-config.d.ts",
        src: resolver.resolve(runtimeDir, "types/config.d.ts")
      },
      { nitro: true, nuxt: true }
    );

    /**
     * Why via tsConfig? Im not saying its wrong though.
     * We also want this import to only be available in nitro runtime (similar to the full directus config from the directus-config module)
     *
     * Ah i now see that dirctus-config follows this patterns as well
     * the directus module follows a different pattern though
     */
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
        generateDirectusSitemapsConfigSource(
          options.collections,
          options.static ?? [],
          hasKey(nuxt.options, "_directus") &&
            isRecord(nuxt.options._directus) &&
            hasKey(nuxt.options._directus, "collections")
        )
    });

    // Get the config property for @nuxtjs/sitemap
    const sitemap = get(nuxt.options, "sitemap");

    const isNuxtSitemapEnabled = isDefined(sitemap) && sitemap !== false;

    // Merge serializable sitemap collection overrides into executable shared configuration.
    const effectiveCollections = mergeDirectusSitemapCollections(
      sharedConfig?.collections ?? [],
      options.collections
    );

    // Get an array of unique sitemap names. If empty, all entries should be placed in the default index sitemap
    const sitemapNamespaces = resolveSitemapNamespaces({
      ...options,
      collections: effectiveCollections
    });

    if (!isNuxtSitemapEnabled) {
      log.warn(
        `@nuxtjs/sitemap is disabled; no Directus sitemap source was registered. The server endpoint "${options.apiEndpoint}" will be registered, but you are responsible for handling the rendering of an .xml file containing sitemap entries.`
      );
    } else if (!sitemapNamespaces.length) {
      const sources = get(sitemap, "sources");
      // Merge our custom source endpoint with any sources that were provided directly to @nuxtjs/sitemap
      set(sitemap, "sources", [options.apiEndpoint, ...(isArray(sources) ? sources : [])]);
    } else {
      registerSitemapNamespaces(sitemap, sitemapNamespaces, options.apiEndpoint);
    }

    const configuredPathPrefix = options.sitemapsPathPrefix.replace(/\/$/u, "");
    // Path prefix provided to @nuxtjs/sitemap takes precedence
    const sitemapsPathPrefix =
      isNuxtSitemapEnabled && isNonBlankString(get(sitemap, "sitemapsPathPrefix"))
        ? (get(sitemap, "sitemapsPathPrefix") as string)
        : configuredPathPrefix;

    if (isNuxtSitemapEnabled) {
      set(sitemap, "sitemapsPathPrefix", sitemapsPathPrefix);
    }

    transpileRuntime(nuxt, runtimeDir);
    addServerHandler({
      method: "get",
      route: options.apiEndpoint,
      handler: resolver.resolve(runtimeDir, "server/routes/urls.get")
    });
    if (options.enablePrettyUrls) {
      addServerHandler({
        method: "get",
        route: "/sitemap",
        handler: resolver.resolve(runtimeDir, "server/routes/pretty-url.get")
      });
    }
    nuxt.options.routeRules ??= {};
    nuxt.options.routeRules[options.apiEndpoint] = defu(
      {
        cache: options.cache,
        prerender: false
      },
      nuxt.options.routeRules[options.apiEndpoint]
    );

    // Only prerender sitemap routes if @nuxtjs/sitemap is enabled.
    // Otherwise there is nothing to prerender
    if (options.prerenderSitemaps) {
      if (sitemap === false) {
        console.warn(
          `@nuxtjs/sitemap is disabled; thus prerendering the sitemap routes has no effect. Skipping prerender routes.`
        );
      } else {
        addPrerenderRoutes([
          options.apiEndpoint,
          ...(sitemapNamespaces.length > 0
            ? [
                "/sitemap_index.xml",
                ...sitemapNamespaces.map((name) =>
                  resolveNamespacedSitemapRoute(name, sitemapsPathPrefix)
                )
              ]
            : ["/sitemap.xml"])
        ]);
      }
    }
    end();
  }
});
