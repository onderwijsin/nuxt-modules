import { defu } from "defu";
import { getResolvedDirectusConfig } from "@onderwijsin/nuxt-directus-config/schema";
import { join } from "node:path";
import {
  addImports,
  addPlugin,
  addServerHandler,
  addServerImportsDir,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";
import { attempt, isNonBlankString, isString } from "@onderwijsin/nuxt-module-utils/shared";

import { parseDirectusCommands } from "./config/commands";
import { directusOptionsSchema } from "./config/options.schema";
import { resolveDirectusTypegenDeclaration } from "./config/typegen";
import { version } from "../package.json";
import type { ModuleOptions } from "./types/options";

const MODULE_KEY = "directus";
const MODULE_NAME = resolveModuleName(MODULE_KEY);
const DIRECTUS_TURNSTILE_ACTIONS = {
  login: "directus-login",
  passwordRequest: "directus-password-request"
};

/** Registers the server-safe Directus module foundation and its validated proxy boundary. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: {
    enabled: true,
    instance: {},
    client: {}
  },
  moduleDependencies: (nuxt): ModuleDependencies => {
    const sharedConfig = getResolvedDirectusConfig(nuxt);
    const directusOptions = defu(nuxt.options.directus, sharedConfig);
    return directusOptions?.client?.auth?.turnstile?.enabled
      ? { "@onderwijsin/nuxt-turnstile": { version: ">=0.2.5" } }
      : {};
  },
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);

    start();
    const sharedConfig = getResolvedDirectusConfig(nuxt);
    const options = validateModuleOptions(
      defu(rawOptions, sharedConfig),
      directusOptionsSchema,
      log
    );
    const baseUrl = options.instance.baseUrl ?? "";
    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    const isCI = process.env.CI === "true";

    addTypeTemplate({
      filename: "types/directus-config.d.ts",
      src: resolver.resolve(runtimeDir, "types/config.d.ts")
    });
    addTypeTemplate({
      filename: "types/directus-schema.d.ts",
      getContents: async () => {
        const result = await attempt(() =>
          resolveDirectusTypegenDeclaration({
            enabled: options.client.typegen.enabled,
            directusUrl: baseUrl,
            directusToken: options.client.typegen.introspectionToken,
            augmentations: options.client.typegen.augmentations,
            rules: options.client.typegen.rules,
            transform: options.client.typegen.transform,
            cacheFile: join(nuxt.options.buildDir, "directus-typegen-cache.json"),
            generatedFile: join(nuxt.options.buildDir, "types/directus-schema.d.ts"),
            maxAge: options.client.typegen.cache.maxAge,
            isDevelopment: nuxt.options.dev,
            isCI: process.env.CI === "true",
            log
          })
        );
        if (isString(result.data)) {
          return result.data;
        }
        log.error("Directus schema type template failed.");
        throw result.error;
      }
    });
    nuxt.options.alias ??= {};
    nuxt.options.alias["#directus"] = resolver.resolve(
      nuxt.options.buildDir,
      "types/directus-schema.d.ts"
    );
    const nodeTsConfig = (nuxt.options.typescript.nodeTsConfig ??= {});
    nodeTsConfig.compilerOptions ??= {};
    nodeTsConfig.compilerOptions.paths ??= {};
    nodeTsConfig.compilerOptions.paths["#directus"] = ["./types/directus-schema"];

    if (!isEnabled()) return;

    if (!isNonBlankString(baseUrl) && !nuxt.options._prepare && !isCI) {
      log.warn("Directus baseUrl is not set. Disabling Directus module.");
      return;
    }

    const commands = parseDirectusCommands(options.client.commands);
    for (const name of commands) addImports({ name, as: name, from: "@directus/sdk" });

    nuxt.options.runtimeConfig.directus = defu(
      {
        baseUrl,
        staticToken: options.instance.staticToken,
        typegen: { introspectionToken: options.client.typegen.introspectionToken },
        auth: {
          ...options.client.auth,
          turnstile: {
            ...options.client.auth.turnstile,
            actions: DIRECTUS_TURNSTILE_ACTIONS
          }
        }
      },
      nuxt.options.runtimeConfig.directus
    );
    nuxt.options.runtimeConfig.public.directus = defu(
      {
        proxy: { path: options.client.proxy.path },
        preview: options.client.preview,
        auth: {
          enabled: options.client.auth.enabled,
          turnstile: {
            enabled: options.client.auth.turnstile.enabled,
            actions: DIRECTUS_TURNSTILE_ACTIONS
          }
        }
      },
      nuxt.options.runtimeConfig.public.directus
    );

    transpileRuntime(nuxt, runtimeDir);
    for (const [name, file] of [
      ["useDirectus", "directus"],
      ["useDirectusError", "directus-error"],
      ["useDirectusItemByPath", "directus-item"]
    ] as const) {
      addImports({ name, from: resolver.resolve(runtimeDir, "app/composables", file) });
    }
    addServerImportsDir(resolver.resolve(runtimeDir, "server/composables"));
    addPlugin({ src: resolver.resolve(runtimeDir, "app/plugins/client"), mode: "client" });
    addPlugin({
      src: resolver.resolve(
        runtimeDir,
        options.client.auth.enabled ? "app/plugins/server-auth" : "app/plugins/server"
      ),
      mode: "server"
    });

    if (options.client.auth.enabled) {
      addImports({
        name: "useDirectusAuth",
        from: resolver.resolve(runtimeDir, "app/composables/directus-auth")
      });
      const authRoutes = [
        ["login", "post"],
        ["refresh", "post"],
        ["logout", "post"],
        ["session", "get"],
        ["password-request", "post"],
        ["password-reset", "post"]
      ] as const;
      for (const [name, method] of authRoutes) {
        const route = "/_directus/auth/" + name;
        addServerHandler({
          route,
          method,
          handler: resolver.resolve(runtimeDir, "server/handlers/auth/" + name + "." + method)
        });
      }
    }
    addServerHandler({
      route: `${options.client.proxy.path}/**`,
      handler: resolver.resolve(runtimeDir, "server/handlers/proxy")
    });
    nuxt.options.routeRules ??= {};
    nuxt.options.routeRules[`${options.client.proxy.path}/**`] = {
      ...nuxt.options.routeRules[`${options.client.proxy.path}/**`],
      cache: false,
      prerender: false
    };

    end();
  }
});
