import {
  addImportsDir,
  addServerScanDir,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import { defu } from "defu";
import { moduleSetup, resolveLoggerScope, resolveModuleName } from "module-utils";

import { version } from "../package.json";
import { turnstileOptionsSchema } from "./config/options.schema";
import type { ModuleOptions } from "./types/options";

const MODULE_KEY = "turnstile";
const MODULE_NAME = resolveModuleName(MODULE_KEY);
const DEFAULTS = {
  enabled: true,
  siteKey: "",
  secretKey: "",
  adminToken: "",
  adminHeaderName: "x-admin-token"
} satisfies Required<ModuleOptions>;

/** Registers shared Turnstile configuration, client helpers, and server validation. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: DEFAULTS,
  moduleDependencies: {
    "@nuxt/ui": { version: ">=4.0.0" },
    "@nuxtjs/turnstile": { version: ">=1.1.3" }
  },
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const parsed = turnstileOptionsSchema.safeParse(defu(rawOptions, DEFAULTS));
    if (!parsed.success) {
      log.error(`Invalid ${MODULE_NAME} options: ${parsed.error.message}`);
      throw new Error(`Invalid ${MODULE_NAME} options. See the validation errors above.`);
    }
    const options = parsed.data;
    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    addTypeTemplate({
      filename: "types/turnstile-config.d.ts",
      src: resolver.resolve(runtimeDir, "types/config.d.ts")
    });

    if (!isEnabled()) return;

    nuxt.options.runtimeConfig.turnstile = defu(nuxt.options.runtimeConfig.turnstile, {
      secretKey: options.secretKey,
      adminToken: options.adminToken,
      adminHeaderName: options.adminHeaderName
    });
    nuxt.options.runtimeConfig.public.turnstile = defu(
      nuxt.options.runtimeConfig.public.turnstile,
      {
        siteKey: options.siteKey
      }
    );
    const optionsWithTurnstile = nuxt.options as typeof nuxt.options & { turnstile?: unknown };
    optionsWithTurnstile.turnstile = defu(optionsWithTurnstile.turnstile, {
      siteKey: options.siteKey
    });
    nuxt.options.build.transpile.push(runtimeDir);
    addImportsDir(resolver.resolve(runtimeDir, "app", "composables"));
    addServerScanDir(resolver.resolve(runtimeDir, "server"));

    end();
  }
});
