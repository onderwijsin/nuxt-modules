import { resolve } from "node:path";

import {
  addComponent,
  addComponentsDir,
  addServerHandler,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import {
  moduleDependenciesWhenEnabled,
  moduleSetup,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";

import { version } from "../package.json";
import {
  discoverRendererComponents,
  generateReferenceResolver,
  generateRendererManifest,
  mergeRendererComponents
} from "./config/components";
import { generateMetadataHandler } from "./config/metadata-handler";
import { markdownRendererOptionsSchema } from "./config/options.schema";
import type { ModuleOptions } from "./config/options.schema";

const MODULE_KEY = "markdownRenderer";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

/** Registers the MarkdownRenderer component for Nuxt applications. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: { enabled: true, componentsDir: "renderer", componentSets: {} },
  moduleDependencies: (nuxt): ModuleDependencies =>
    moduleDependenciesWhenEnabled(nuxt.options.markdownRenderer, {
      "@comark/nuxt": { version: ">=0.7.0" },
      "@nuxt/ui": { version: ">=4.0.0" },
      "nuxt-component-meta": {
        version: ">=0.18.0",
        defaults: { exclude: ["Markdown", "MarkdownDocument"] }
      }
    }),
  setup(rawOptions, nuxt) {
    const log = useLogger(MODULE_KEY);
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();
    const options = validateModuleOptions(rawOptions, markdownRendererOptionsSchema, log);

    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");
    addTypeTemplate({
      filename: "types/markdown-renderer.d.ts",
      src: resolver.resolve(runtimeDir, "types", "markdown-renderer.d.ts")
    });

    if (!isEnabled()) return;

    const builtInDirectory = resolver.resolve(runtimeDir, "app", "components", "renderer");
    const consumerDirectory = resolve(nuxt.options.srcDir, "components", options.componentsDir);
    const components = mergeRendererComponents(
      discoverRendererComponents(builtInDirectory),
      discoverRendererComponents(consumerDirectory)
    );

    const manifest = addTemplate({
      filename: "markdown-renderer/manifest.mjs",
      write: true,
      getContents: () => generateRendererManifest(components, options.componentSets)
    });
    const referenceResolver = addTemplate({
      filename: "markdown-renderer/reference-resolver.ts",
      write: true,
      getContents: () => generateReferenceResolver(options.resolveReferencePath)
    });
    const metadataHandler = addTemplate({
      filename: "markdown-renderer/metadata-handler.mjs",
      write: true,
      getContents: () =>
        generateMetadataHandler(
          resolver.resolve(runtimeDir, "server", "utils", "metadata"),
          components.map(({ name }) => name),
          options.componentSets
        )
    });

    nuxt.options.alias["#markdown-renderer/manifest"] = manifest.dst;
    nuxt.options.alias["#markdown-renderer/reference-resolver"] = referenceResolver.dst;
    transpileRuntime(nuxt, runtimeDir);
    addComponent({
      name: "MarkdownRenderer",
      filePath: resolver.resolve(runtimeDir, "app", "components", "MarkdownRenderer.vue")
    });
    addComponentsDir({
      path: builtInDirectory,
      pathPrefix: false,
      global: false,
      priority: 0
    });
    if (components.some(({ filePath }) => filePath.startsWith(consumerDirectory))) {
      addComponentsDir({
        path: consumerDirectory,
        pathPrefix: false,
        global: false,
        priority: 1
      });
    }
    addServerHandler({
      method: "get",
      route: "/api/markdown-renderer/components/:componentSet?",
      handler: metadataHandler.dst
    });

    end();
  }
});
