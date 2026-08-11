import { defu } from "defu";
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
    baseUrl: "",
    proxy: { path: "/_directus/proxy" },
    commands: ["readItem", "readItems"],
    auth: { enabled: false },
    typegen: {}
  },
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);

    start();
    const options = validateModuleOptions(rawOptions, directusOptionsSchema, log);
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
            enabled: options.typegen.enabled,
            directusUrl: options.baseUrl,
            directusToken: options.typegen.introspectionToken,
            augmentations: options.typegen.augmentations,
            rules: options.typegen.rules,
            transform: options.typegen.transform,
            cacheFile: join(nuxt.options.buildDir, "directus-typegen-cache.json"),
            generatedFile: join(nuxt.options.buildDir, "types/directus-schema.d.ts"),
            maxAge: options.typegen.cache.maxAge,
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

    if (!isNonBlankString(options.baseUrl) && (nuxt.options._prepare || isCI)) {
      log.warn("Directus baseUrl is not set. Disabling Directus module.");
      return;
    }

    const commands = parseDirectusCommands(options.commands);
    for (const name of commands) addImports({ name, as: name, from: "@directus/sdk" });

    nuxt.options.runtimeConfig.directus = defu(
      {
        baseUrl: options.baseUrl,
        staticToken: options.staticToken,
        typegen: { introspectionToken: options.typegen.introspectionToken },
        auth: options.auth
      },
      nuxt.options.runtimeConfig.directus
    );
    nuxt.options.runtimeConfig.public.directus = defu(
      {
        proxy: { path: options.proxy.path },
        preview: options.preview,
        auth: { enabled: options.auth.enabled }
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
        options.auth.enabled ? "app/plugins/server-auth" : "app/plugins/server"
      ),
      mode: "server"
    });

    if (options.auth.enabled) {
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
      route: `${options.proxy.path}/**`,
      handler: resolver.resolve(runtimeDir, "server/handlers/proxy")
    });
    nuxt.options.routeRules ??= {};
    nuxt.options.routeRules[`${options.proxy.path}/**`] = {
      ...nuxt.options.routeRules[`${options.proxy.path}/**`],
      cache: false,
      prerender: false
    };

    end();
  }
});
