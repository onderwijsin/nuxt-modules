import { addTemplate, defineNuxtModule, useLogger } from "@nuxt/kit";
import { defu } from "defu";
import { join } from "pathe";
import { moduleSetup, resolveLoggerScope, resolveModuleName } from "module-utils";

import type { ModuleOptions, ResolvedModuleOptions } from "./types/options";
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
} satisfies ResolvedModuleOptions;

/** Registers the generated web app manifest and its public asset. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: DEFAULTS,
  moduleDependencies: {
    "@nuxt/image": { version: "2.1.0" },
    "nuxt-site-config": { version: "4.2.0" },
    "nuxt-schema-org": { version: "6.2.8" }
  },
  setup(options, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, options, log);
    start();
    if (nuxt.options.dev || !isEnabled()) return;

    const resolvedOptions = options as ResolvedModuleOptions;
    const iconResolution = resolvedOptions.manifest?.icons
      ? { warnings: [] }
      : resolveIconConfig(resolvedOptions, nuxt);
    for (const warning of iconResolution.warnings) log.warn(warning);

    const manifest = generateWebManifest(resolvedOptions, nuxt, iconResolution);
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
    nuxt.options.app = defu(nuxt.options.app, {
      head: { link: [{ rel: "manifest", href: "/app.webmanifest" }] }
    });
    end();
  }
});
