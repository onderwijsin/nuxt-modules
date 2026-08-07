import {
  addImportsDir,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import crawlers from "crawler-user-agents" with { type: "json" };
import { defu } from "defu";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime
} from "module-utils/shared";

import { version } from "../package.json";
import type { ModuleOptions } from "./types/options";

const MODULE_KEY = "device";
const MODULE_NAME = resolveModuleName(MODULE_KEY);
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36";

const DEFAULTS = {
  enabled: true,
  defaultUserAgent: DEFAULT_USER_AGENT,
  refreshOnResize: false
} satisfies Required<ModuleOptions>;

/** Registers request-aware device detection and the generated crawler matcher. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: DEFAULTS,
  setup(options, nuxt) {
    const resolvedOptions = defu(options, DEFAULTS);
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, resolvedOptions, log);

    start();

    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    addTypeTemplate({
      filename: "types/device-config.d.ts",
      src: resolver.resolve(runtimeDir, "types/config.d.ts")
    });
    addTypeTemplate({
      filename: "types/device.d.ts",
      src: resolver.resolve(runtimeDir, "types/device.d.ts")
    });

    if (!isEnabled()) return;

    nuxt.options.runtimeConfig.public.device = defu(
      nuxt.options.runtimeConfig.public.device,
      resolvedOptions
    );
    transpileRuntime(nuxt, runtimeDir);
    addImportsDir(resolver.resolve(runtimeDir, "app", "composables"));

    addTemplate({
      filename: "templates/device/crawlers-regex.mjs",
      write: true,
      getContents: () =>
        `export const REGEX_CRAWLER = new RegExp(${JSON.stringify(crawlers.map((crawler) => crawler.pattern).join("|"))})\n`
    });

    end();
  }
});
