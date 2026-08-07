import { addTemplate, defineNuxtModule, useLogger } from "@nuxt/kit";
import { defu } from "defu";
import { join } from "pathe";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  validateModuleOptions
} from "module-utils/shared";

import { moduleOptionsShape } from "./config/options.schema";
import type { ModuleOptions } from "./types/options";
import { generateWebManifest, resolveIconConfig } from "./utils";

const MODULE_KEY = "webmanifest";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

const DEFAULTS = {
  enabled: true,
  manifest: {
    background_color: "#ffffff",
    theme_color: "#ffffff",
    related_applications: [],
    prefer_related_applications: false,
    screenshots: [],
    lang: "nl",
    dir: "ltr",
    orientation: "portrait",
    display: "standalone"
  }
} satisfies ModuleOptions;

/** Registers the generated web app manifest and its public asset. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: DEFAULTS,
  moduleDependencies: {
    "@nuxt/image": { version: ">=2.0.0" },
    "nuxt-site-config": { version: ">=4.0.0" },
    "nuxt-schema-org": { version: ">=6.0.0" }
  },
  setup(options, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, options, log);
    start();
    if (!isEnabled()) return;

    const validatedOptions = validateModuleOptions(options, moduleOptionsShape, log);
    const iconResolution = validatedOptions.manifest?.icons
      ? { warnings: [] }
      : resolveIconConfig(validatedOptions, nuxt);
    for (const warning of iconResolution.warnings) log.warn(warning);

    const manifest = generateWebManifest(validatedOptions, nuxt, iconResolution);
    addTemplate({
      filename: "templates/webmanifest/app.webmanifest",
      getContents: () => JSON.stringify(manifest, null, 2),
      write: true
    });

    nuxt.options.nitro.publicAssets ??= [];
    nuxt.options.nitro = defu(nuxt.options.nitro, {
      publicAssets: [
        { maxAge: 60 * 60 * 24 * 7, dir: join(nuxt.options.buildDir, "templates", "webmanifest") }
      ]
    });

    nuxt.options.app.head ??= {};
    nuxt.options.app.head.link ??= [];
    nuxt.options.app.head.link.push({ rel: "manifest", href: "/app.webmanifest" });

    end();
  }
});
