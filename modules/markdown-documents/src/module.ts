import {
  addServerImports,
  addServerPlugin,
  addServerTemplate,
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
import { version } from "../package.json";
import { markdownDocumentsOptionsSchema } from "./config/options.schema";
import {
  documentServiceUtilities,
  generateDocumentServiceTypes,
  generateDocumentRegistry,
  watchDocumentDefinitions,
  resolveDefinitionDirectory
} from "./config/definitions";
import { registerDocumentDelivery } from "./config/http";
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
      filename: "#markdown-documents",
      getContents: () =>
        generateDocumentRegistry(directory, resolver.resolve(runtimeDir, "server"), {
          baseURL: nuxt.options.app.baseURL,
          rawPrefix: options.rawPrefix,
          prerender: options.prerender
        })
    });
    addServerImports(documentServiceUtilities.map((name) => ({ name, from: registry.filename })));
    addTypeTemplate(
      { filename: "types/markdown-documents.d.ts", getContents: generateDocumentServiceTypes },
      { nuxt: false, nitro: true }
    );
    const plugin = addServerTemplate({
      filename: resolver.resolve(nuxt.options.buildDir, "markdown-documents/plugin.mjs"),
      getContents: () => `import ${JSON.stringify(registry.filename)};
export default () => {};
`
    });
    addServerPlugin(plugin.filename);

    registerDocumentDelivery(nuxt, resolver.resolve(runtimeDir, "server"));
    if (nuxt.options.dev) watchDocumentDefinitions(nuxt, directory);
    end();
  }
});
