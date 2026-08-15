import {
  addServerTemplate,
  addTemplate,
  addTypeTemplate,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import { defu } from "defu";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";

import { directusConfigOptionsSchema } from "./options.schema";
import {
  generateDirectusRuntimeConfigSource,
  generateDirectusServerConfigDeclarationSource,
  generateDirectusServerConfigSource,
  loadDirectusConfigSource,
  resolveDirectusConfigFile
} from "./config/source";
import { setResolvedDirectusConfig } from "./schema";
import { version } from "../package.json";
import type { ModuleOptions } from "./options.schema";

const MODULE_KEY = "directusConfig";
const MODULE_NAME = resolveModuleName("directus-config");

/** Registers the virtual shared Directus config source for related modules. */
export default defineNuxtModule<ModuleOptions>({
  meta: { name: MODULE_NAME, configKey: MODULE_KEY, version, compatibility: { nuxt: "^4.0.0" } },
  defaults: { enabled: true, configFile: "directus.config.ts" },
  async setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const serverConfigTypes = addTypeTemplate(
      {
        filename: "types/directus-config-server.d.ts",
        getContents: generateDirectusServerConfigDeclarationSource
      },
      { nitro: true, nuxt: true }
    );

    // We need to make the #directus-config-server available in the whole nuxt context (not just server)
    // See https://nuxt.com/docs/4.x/guide/modules/recipes-advanced#type-checking-server-routes-in-app-context
    nuxt.options.typescript.tsConfig = defu(nuxt.options.typescript.tsConfig, {});
    nuxt.options.typescript.tsConfig.compilerOptions = defu(
      nuxt.options.typescript.tsConfig.compilerOptions,
      {}
    );
    nuxt.options.typescript.tsConfig.compilerOptions.paths = defu(
      nuxt.options.typescript.tsConfig.compilerOptions.paths,
      {}
    );
    nuxt.options.typescript.tsConfig.compilerOptions.paths["#directus-config-server"] = [
      serverConfigTypes.dst
    ];

    const options = validateModuleOptions(rawOptions, directusConfigOptionsSchema, log);
    if (!isEnabled()) return;

    const configFile = resolveDirectusConfigFile(nuxt.options.rootDir, options.configFile);
    if (options.configFile !== false && !configFile) {
      log.info(`No Directus config source found at ${options.configFile}.`);
    }
    const resolvedConfig = await loadDirectusConfigSource(configFile);
    setResolvedDirectusConfig(nuxt, resolvedConfig);

    const clientConfig = addTemplate({
      filename: "directus-config.mjs",
      write: true,
      getContents: () => generateDirectusRuntimeConfigSource(resolvedConfig)
    });

    addServerTemplate({
      filename: "#directus-config-server",
      getContents: () => generateDirectusServerConfigSource(configFile)
    });

    nuxt.options.alias = defu(nuxt.options.alias, {});
    nuxt.options.alias["#directus-config"] = clientConfig.dst;

    end();
  }
});
