import { defineNuxtModule, useLogger } from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import { defu } from "defu";
import {
  getResolvedDirectusConfig,
  type DirectusCollectionConfig
} from "@onderwijsin/nuxt-directus-config/schema";
import { applyOverridesToCollectionConfig } from "@onderwijsin/nuxt-directus-config/config";
import {
  isPrepareMode,
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";

import { directusPrerendererOptionsSchema } from "./config/options.schema";
import { buildPrerenderRoutes } from "./utils/routes";
import { version } from "../package.json";
import type { ModuleOptions } from "./config/options.schema";

const MODULE_KEY = "directusPrerenderer";
const MODULE_NAME = resolveModuleName("directus-prerenderer");
type PrerenderCollectionConfig = Omit<DirectusCollectionConfig, "sitemap"> & {
  sitemap?: DirectusCollectionConfig["sitemap"];
};

/** Registers Directus collection routes for Nuxt build-time prerendering. */
export default defineNuxtModule<ModuleOptions>({
  meta: { name: MODULE_NAME, configKey: MODULE_KEY, version, compatibility: { nuxt: "^4.0.0" } },
  defaults: {
    enabled: true,
    instance: {},
    collections: []
  },
  moduleDependencies: (nuxt): ModuleDependencies => {
    if (
      nuxt.options.directusPrerenderer === false ||
      nuxt.options.directusPrerenderer?.enabled === false
    ) {
      return {};
    }

    return nuxt.options.modules.some((module) => module === "@onderwijsin/nuxt-directus-config")
      ? { "@onderwijsin/nuxt-directus-config": { version: ">=0.3.0" } }
      : {};
  },
  async setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const sharedConfig = getResolvedDirectusConfig(nuxt);
    const options = validateModuleOptions(
      defu(rawOptions, {
        ...(sharedConfig?.prerenderer ?? {}),
        instance: sharedConfig?.instance ?? {}
      }),
      directusPrerendererOptionsSchema,
      log
    );

    if (!isEnabled() || isPrepareMode(nuxt)) return;

    const collections = applyOverridesToCollectionConfig<
      PrerenderCollectionConfig,
      "prerender",
      (typeof options.collections)[number]
    >(sharedConfig?.collections ?? [], options.collections, "prerender");

    let routesLogged = false;
    nuxt.hook("prerender:routes", async (context) => {
      const routes = await buildPrerenderRoutes(nuxt, collections, options);

      let added = 0;
      for (const route of routes) {
        if (context.routes.has(route)) continue;
        context.routes.add(route);
        added += 1;
      }

      if (!routesLogged) {
        routesLogged = true;
        log.success(`✨ Added ${added} Directus prerender route${added === 1 ? "" : "s"}.`);
      }
    });
    end();
  }
});
