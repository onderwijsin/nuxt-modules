import { addTemplate, defineNuxtModule, useLogger } from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import { defu } from "defu";
import { join } from "pathe";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  validateModuleOptions
} from "module-utils/shared";

import { webmanifestOptionsSchema } from "./config/options.schema";
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
  moduleDependencies: (nuxt): ModuleDependencies =>
    nuxt.options.webmanifest === false || nuxt.options.webmanifest?.enabled === false
      ? {}
      : {
          "@nuxt/image": { version: ">=2.0.0" },
          "nuxt-site-config": { version: ">=4.0.0" },
          "nuxt-schema-org": { version: ">=6.0.0" }
        },
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();
    if (!isEnabled()) return;

    const options = validateModuleOptions(rawOptions, webmanifestOptionsSchema, log);
    const iconResolution = options.manifest?.icons
      ? { warnings: [] }
      : resolveIconConfig(options, nuxt);
    for (const warning of iconResolution.warnings) log.warn(warning);

    const manifest = generateWebManifest(options, nuxt, iconResolution);
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
    const configuredBaseURL = nuxt.options.app.baseURL;
    const baseURL = typeof configuredBaseURL === "string" ? configuredBaseURL : "/";
    const manifestHref = `${baseURL.replace(/\/?$/u, "/")}app.webmanifest`;
    nuxt.options.app.head.link.push({ rel: "manifest", href: manifestHref });

    end();
  }
});
