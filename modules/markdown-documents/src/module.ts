import {
  addServerImports,
  addServerPlugin,
  addServerTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger,
  hasNuxtModule
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
          contentType: options.contentType
        })
    });
    addServerImports(documentServiceUtilities.map((name) => ({ name, from: registry.filename })));
    addTypeTemplate(
      { filename: "types/markdown-documents.d.ts", getContents: generateDocumentServiceTypes },
      { nuxt: false, nitro: true }
    );
    const plugin = addServerTemplate({
      filename: resolver.resolve(nuxt.options.buildDir, "markdown-documents/plugin.mjs"),
      getContents:
        () => `import { registerMarkdownDocumentHandlers } from ${JSON.stringify(resolver.resolve(runtimeDir, "server/http"))};
import { documents, configuration, resolveMarkdownDocument } from ${JSON.stringify(registry.filename)};
export default (app) => registerMarkdownDocumentHandlers(app.h3App, documents, resolveMarkdownDocument, configuration, app.router.handler);
`
    });
    addServerPlugin(plugin.filename);

    nuxt.hook("modules:done", () => {
      // Add nuxt-llms integration
      if (hasNuxtModule("nuxt-llms", nuxt)) {
        const llmsPlugin = addServerTemplate({
          filename: resolver.resolve(nuxt.options.buildDir, "markdown-documents/llms.mjs"),
          getContents:
            () => `import { registerMarkdownDocumentLlms } from ${JSON.stringify(resolver.resolve(runtimeDir, "server/llms"))};
import { service } from ${JSON.stringify(registry.filename)};
export default (app) => registerMarkdownDocumentLlms(app.hooks, service);
`
        });
        addServerPlugin(llmsPlugin.filename);
      }

      // Add nuxt-ai-ready integration
      if (hasNuxtModule("nuxt-ai-ready", nuxt)) {
        const aiReadyPlugin = addServerTemplate({
          filename: resolver.resolve(nuxt.options.buildDir, "markdown-documents/ai-ready.mjs"),
          getContents: () => `import { defineNitroPlugin, useRuntimeConfig } from "#imports";
import { registerMarkdownDocumentAiReady } from ${JSON.stringify(resolver.resolve(runtimeDir, "server/ai-ready"))};
import { registerMarkdownDocumentAiReadySource, registerMarkdownDocumentAiReadyMarkdown } from ${JSON.stringify(resolver.resolve(runtimeDir, "server/ai-ready-content"))};
import { service, configuration } from ${JSON.stringify(registry.filename)};
export default defineNitroPlugin((app) => {
  registerMarkdownDocumentAiReady(app.hooks, service, useRuntimeConfig, configuration);
  registerMarkdownDocumentAiReadySource(app.hooks, service, configuration);
  registerMarkdownDocumentAiReadyMarkdown(app.hooks, service);
});
`
        });
        addServerPlugin(aiReadyPlugin.filename);
      }
    });

    // Add HMR watchers for server/documents
    if (nuxt.options.dev) watchDocumentDefinitions(nuxt, directory);
    end();
  }
});
