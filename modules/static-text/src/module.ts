import type { ModuleOptions } from "./types/options";

import { resolve } from "node:path";
import {
  addImports,
  addPlugin,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import { moduleSetup, resolveLoggerScope, resolveModuleName } from "module-utils/shared";
import { z } from "zod";

import optionsSchema from "./config/options.schema";
import { version } from "../package.json";

export type { TextDictionary, TextKey, TextTranslator } from "./types/dictionary";

const MODULE_KEY = "staticText";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

const DEFAULTS = {
  enabled: true,
  content: "assets/ui/content"
} satisfies ModuleOptions;

const moduleOptionsSchema = z.object(optionsSchema);

function normalizeContentPath(content: string): string {
  return content.startsWith("./") ? content.slice(2) : content;
}

/**
 * Provides a typed, Vue-I18n-compatible text lookup API backed by a project's local content file.
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: {
      nuxt: "^4.0.0"
    }
  },
  defaults: DEFAULTS,
  setup(options, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, options, log);

    start();

    const result = moduleOptionsSchema.safeParse(options);

    if (!result.success) {
      throw new Error(
        `Invalid @onderwijsin/nuxt-static-text options: ${z.prettifyError(result.error)}`
      );
    }

    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");
    const runtimeAppDir = resolver.resolve(runtimeDir, "app");

    addTypeTemplate({
      filename: "types/static-text.d.ts",
      src: resolver.resolve(runtimeDir, "types/static-text.d.ts")
    });

    if (!isEnabled()) return;

    const contentPath = resolve(
      nuxt.options.srcDir,
      normalizeContentPath(result.data.content ?? DEFAULTS.content)
    );

    nuxt.options.build.transpile.push(runtimeDir);

    addTemplate({
      filename: "static-text-content.ts",
      write: true,
      getContents: () =>
        `// @ts-ignore The configured content path is resolved in the consuming Nuxt app.\nexport { default } from ${JSON.stringify(contentPath)};\n`
    });
    addImports({
      name: "useText",
      from: resolver.resolve(runtimeAppDir, "composables/text")
    });
    addPlugin(resolver.resolve(runtimeAppDir, "plugins/text"));
    end();
  }
});
