import { resolve } from "pathe";

import {
  addComponent,
  addComponentsDir,
  addServerHandler,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  findPath,
  resolvePath,
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
  generateRendererManifest,
  mergeRendererComponents,
  selectRendererComponents
} from "./config/components";
import type { RendererComponent } from "./config/components";
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
  defaults: { enabled: true, componentsDir: "renderer", componentSets: {}, corsOrigin: "*" },
  moduleDependencies: (nuxt): ModuleDependencies =>
    moduleDependenciesWhenEnabled(nuxt.options.markdownRenderer, {
      "@comark/nuxt": { version: ">=0.7.0" },
      "@nuxt/ui": { version: ">=4.0.0" },
      "nuxt-component-meta": {
        version: ">=0.18.0",
        defaults: { exclude: ["@comark/vue"] }
      }
    }),
  async setup(rawOptions, nuxt) {
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
    const consumerDirectoryExists = await findPath(consumerDirectory, {}, "dir");
    let components: RendererComponent[] = [];

    nuxt.hook("components:extend", (nuxtComponents) => {
      components = mergeRendererComponents(
        selectRendererComponents(nuxtComponents, [builtInDirectory]),
        selectRendererComponents(nuxtComponents, [consumerDirectory])
      );
    });

    const manifest = addTemplate({
      filename: "markdown-renderer/manifest.mjs",
      write: true,
      getContents: () => generateRendererManifest(components, options.componentSets)
    });
    const metadataHandler = addTemplate({
      filename: "markdown-renderer/metadata-handler.mjs",
      write: true,
      getContents: () => `
import componentMeta from "#nuxt-component-meta/nitro";
import { createComponentMetadataHandler } from ${JSON.stringify(
        resolver.resolve(runtimeDir, "server", "utils", "component-metadata-handler")
      )};

export default createComponentMetadataHandler(
  componentMeta,
  ${JSON.stringify(components.map(({ name, componentName }) => ({ name, componentName })))},
  ${JSON.stringify(options.componentSets)},
  ${JSON.stringify(options.corsOrigin)}
);
`
    });
    const referenceResolver = options.resolveReferencePath
      ? await resolvePath(options.resolveReferencePath)
      : resolver.resolve(runtimeDir, "app", "utils", "resolve-reference-path");

    nuxt.options.alias["#markdown-renderer/manifest"] = manifest.dst;
    nuxt.options.alias["#markdown-renderer/manifest-factory"] = resolver.resolve(
      runtimeDir,
      "app",
      "utils",
      "component-manifest"
    );
    nuxt.options.alias["#markdown-renderer/reference-resolver"] = referenceResolver;
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
    if (consumerDirectoryExists) {
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
    addServerHandler({
      method: "options",
      route: "/api/markdown-renderer/components/:componentSet?",
      handler: metadataHandler.dst
    });

    end();
  }
});
