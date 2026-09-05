import { defu } from "defu";
import { getResolvedDirectusConfigFromSource } from "@onderwijsin/nuxt-directus-config/config";
import { getResolvedDirectusConfig } from "@onderwijsin/nuxt-directus-config/schema";
import { join } from "node:path";
import {
  addImports,
  addPlugin,
  addServerPlugin,
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
import {
  attempt,
  isNonBlankString,
  isRecord,
  isString
} from "@onderwijsin/nuxt-module-utils/shared";

import { parseDirectusCommands } from "./config/commands";
import { directusClientOptionsSchema } from "./config/options.schema";
import { resolveDirectusTypegenDeclaration } from "./config/typegen";
import { resolveDirectusSessionSecret } from "./config/session-secret";
import { version } from "../package.json";
import type { ModuleOptions } from "./config/options.schema";

const MODULE_KEY = "directusClient";
const MODULE_NAME = resolveModuleName(MODULE_KEY);
const DIRECTUS_TURNSTILE_ACTIONS = {
  login: "directus-login",
  passwordRequest: "directus-password-request",
  magicLinkRequest: "directus-magic-link-request"
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
  moduleDependencies: async (nuxt): Promise<ModuleDependencies> => {
    const directusConfigModuleRegistered = nuxt.options.modules.some(
      (module) => module === "@onderwijsin/nuxt-directus-config"
    );

    const dependencies: ModuleDependencies = {};

    if (directusConfigModuleRegistered) {
      dependencies["@onderwijsin/nuxt-directus-config"] = { version: ">=0.3.0" };
    }

    const directusConfigOptions = Reflect.get(nuxt.options, "directusConfig");
    const configFile: string | false =
      directusConfigModuleRegistered &&
      isRecord(directusConfigOptions) &&
      (isString(directusConfigOptions.configFile) || directusConfigOptions.configFile === false)
        ? directusConfigOptions.configFile
        : "directus.config.ts";
    const sharedConfig =
      getResolvedDirectusConfig(nuxt) ??
      (directusConfigModuleRegistered
        ? await getResolvedDirectusConfigFromSource(nuxt.options.rootDir, configFile)
        : undefined);
    const directusClientOptions = defu(nuxt.options.directusClient, sharedConfig);

    if (directusClientOptions?.client?.auth?.turnstile?.enabled) {
      dependencies["@onderwijsin/nuxt-turnstile"] = { version: ">=0.2.5" };
    }

    return dependencies;
  },
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    // Validate with merged directus.config.ts
    const sharedConfig = getResolvedDirectusConfig(nuxt);
    const input = defu(rawOptions, sharedConfig);
    const sessionSecret = resolveDirectusSessionSecret({
      configured: input.client?.auth?.sessionSecret ?? undefined,
      isCI: process.env.CI === "true",
      isPrepare: nuxt.options._prepare,
      isDevelopment: nuxt.options.dev
    });
    const validationOptions =
      input.client?.auth?.enabled && sessionSecret
        ? defu({ client: { auth: { sessionSecret } } }, input)
        : input;
    const options = validateModuleOptions(validationOptions, directusClientOptionsSchema, log);

    const baseUrl = options.instance.baseUrl ?? "";
    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    const isCI = process.env.CI === "true";

    // Add type template even if module is disbaled. This prevent typecheck failures in ci
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
    nuxt.options.alias = defu(nuxt.options.alias, {});
    nuxt.options.alias["#directus"] = resolver.resolve(
      nuxt.options.buildDir,
      "types/directus-schema.d.ts"
    );
    const nodeTsConfig = (nuxt.options.typescript.nodeTsConfig = defu(
      nuxt.options.typescript.nodeTsConfig,
      {}
    ));
    nodeTsConfig.compilerOptions = defu(nodeTsConfig.compilerOptions, {});
    nodeTsConfig.compilerOptions.paths = defu(nodeTsConfig.compilerOptions.paths, {});
    nodeTsConfig.compilerOptions.paths["#directus"] = ["./types/directus-schema"];

    if (!isEnabled()) return;

    if (!isNonBlankString(baseUrl) && !nuxt.options._prepare && !isCI) {
      log.warn("Directus baseUrl is not set. Disabling Directus module.");
      return;
    }

    const commands = parseDirectusCommands(options.client.commands);
    for (const name of commands) addImports({ name, as: name, from: "@directus/sdk" });

    // Keep the root RuntimeConfig object identity required by Nuxt; merge the owned namespace with defu.
    Object.assign(nuxt.options.runtimeConfig, {
      directusClient: defu(
        {
          baseUrl,
          ...(options.instance.staticToken ? { staticToken: options.instance.staticToken } : {}),
          auth: {
            ...options.client.auth,
            turnstile: {
              ...options.client.auth.turnstile,
              actions: DIRECTUS_TURNSTILE_ACTIONS
            }
          },
          assets: {
            ...(options.client.assets.url ? { url: options.client.assets.url } : {}),
            publicOnly: options.client.assets.publicOnly,
            cache: options.client.assets.cache
          }
        },
        nuxt.options.runtimeConfig.directusClient
      )
    });
    nuxt.options.runtimeConfig.public.directusClient = defu(
      {
        proxy: { path: options.client.proxy.path },
        assets: { enabled: options.client.assets.enabled, path: options.client.assets.path },
        preview: options.client.preview,
        auth: {
          enabled: options.client.auth.enabled,
          magicLinks: { enabled: options.client.auth.magicLinks.enabled },
          maskSecretsInPlayground: options.client.auth.maskSecretsInPlayground,
          turnstile: {
            enabled: options.client.auth.turnstile.enabled,
            actions: DIRECTUS_TURNSTILE_ACTIONS
          }
        }
      },
      nuxt.options.runtimeConfig.public.directusClient
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
      addServerPlugin(resolver.resolve(runtimeDir, "server/plugins/directus-auth"));
    }

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
      if (options.client.auth.magicLinks.enabled) {
        for (const [name, method] of [
          ["magic-links/request", "post"],
          ["magic-links/redeem", "post"]
        ] as const) {
          addServerHandler({
            route: "/_directus/auth/" + name,
            method,
            handler: resolver.resolve(runtimeDir, "server/handlers/auth/" + name + "." + method)
          });
        }
      }
    }
    addServerHandler({
      route: `${options.client.proxy.path}/**`,
      handler: resolver.resolve(runtimeDir, "server/handlers/proxy")
    });
    nuxt.options.routeRules = defu(nuxt.options.routeRules, {});
    nuxt.options.routeRules[`${options.client.proxy.path}/**`] = defu(
      {
        cache: false,
        prerender: false
      },
      nuxt.options.routeRules[`${options.client.proxy.path}/**`]
    );
    if (options.client.assets.enabled) {
      addServerHandler({
        route: `${options.client.assets.path}/**`,
        handler: resolver.resolve(runtimeDir, "server/handlers/assets")
      });
      nuxt.options.routeRules[`${options.client.assets.path}/**`] = defu(
        {
          cache: false,
          prerender: false
        },
        nuxt.options.routeRules[`${options.client.assets.path}/**`]
      );
    }

    end();
  }
});
