import { createResolver, defineNuxtModule, useLogger } from "@nuxt/kit";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";
import { version } from "../package.json";
import { markdownDocumentsOptionsSchema } from "./config/options.schema";
import { resolveDefinitionDirectory, watchDocumentDefinitions } from "./config/definitions";
import { registerDocuments } from "./config/register-documents";
import { registerDiscovery } from "./config/register-discovery";
import type { ModuleOptions } from "./types/options";

export type { ModuleOptions } from "./types/options";

const MODULE_KEY = "markdownDocuments";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

/** Registers typed server documents, structured utilities and scoped Markdown delivery. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: { enabled: true },
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();
    const options = validateModuleOptions(rawOptions, markdownDocumentsOptionsSchema, log);
    if (!isEnabled()) return;

    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");
    const serverRuntimeDir = resolver.resolve(runtimeDir, "server");
    const directory = resolveDefinitionDirectory(
      nuxt.options.rootDir,
      options.dir,
      rawOptions.dir !== undefined
    );
    transpileRuntime(nuxt, runtimeDir);
    const registry = registerDocuments(nuxt, serverRuntimeDir, directory, options);

    // AI Ready can be installed by Nuxt SEO after this module's setup runs.
    nuxt.hook("modules:done", () =>
      registerDiscovery(
        nuxt,
        serverRuntimeDir,
        registry,
        options.dedupeAiReadyLlmsSitemapEntries,
        log
      )
    );

    // Refresh registry membership when definition files are added or removed in development.
    if (nuxt.options.dev) watchDocumentDefinitions(nuxt, directory);
    end();
  }
});
