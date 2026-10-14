import {
  addServerImports,
  addServerPlugin,
  addServerTemplate,
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
import { version } from "../package.json";
import { markdownDocumentsOptionsSchema } from "./config/options.schema";
import {
  generateDocumentRegistry,
  watchDocumentDefinitions,
  resolveDefinitionDirectory
} from "./config/definitions";
import type { ModuleOptions } from "./types/options";

export type { ModuleOptions } from "./types/options";

const MODULE_KEY = "markdownDocuments";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

/** Registers typed server definitions without enabling the later delivery pipeline. */
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
    const directory = resolveDefinitionDirectory(
      nuxt.options.rootDir,
      options.dir,
      rawOptions.dir !== undefined
    );
    transpileRuntime(nuxt, runtimeDir);
    addServerImports({
      name: "defineMarkdownDocument",
      from: resolver.resolve(runtimeDir, "server/index")
    });

    const registry = addServerTemplate({
      filename: resolver.resolve(nuxt.options.buildDir, "markdown-documents/registry.mjs"),
      getContents: () =>
        generateDocumentRegistry(directory, resolver.resolve(runtimeDir, "server/registry"), {
          rawPrefix: options.rawPrefix,
          prerender: options.prerender
        })
    });
    const plugin = addServerTemplate({
      filename: resolver.resolve(nuxt.options.buildDir, "markdown-documents/plugin.mjs"),
      getContents: () => `import ${JSON.stringify(registry.filename)};
export default () => {};
`
    });
    addServerPlugin(plugin.filename);

    if (nuxt.options.dev) watchDocumentDefinitions(nuxt, directory);
    end();
  }
});
