import {
  addImportsDir,
  addServerScanDir,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import { defu } from "defu";
import {
  moduleDependenciesWhenEnabled,
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";
import { hasKey, isArray, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

import { version } from "../package.json";
import { turnstileOptionsSchema } from "./config/options.schema";
import type { ModuleOptions } from "./config/options.schema";

const MODULE_KEY = "turnstile";
const MODULE_NAME = resolveModuleName(MODULE_KEY);
const DEFAULTS = {
  enabled: true,
  siteKey: "",
  secretKey: "",
  adminToken: "",
  adminHeaderName: "x-admin-token"
} satisfies Required<ModuleOptions>;

/**
 * Identifies the upstream verifier auto-import preset that conflicts with this module's verifier.
 * @param preset - A Nitro auto-import preset candidate.
 * @returns Whether the preset provides the upstream Turnstile verifier.
 */
function isUpstreamTurnstileVerifierPreset(preset: unknown): boolean {
  return (
    isRecord(preset) &&
    isString(preset.from) &&
    preset.from.includes("@nuxtjs/turnstile") &&
    isArray(preset.imports) &&
    preset.imports.includes("verifyTurnstileToken")
  );
}

/** Registers shared Turnstile configuration, client helpers, and server validation. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: DEFAULTS,
  moduleDependencies: (nuxt): ModuleDependencies =>
    moduleDependenciesWhenEnabled(nuxt.options.turnstile, {
      "@nuxt/ui": { version: ">=4.0.0" },
      "@nuxtjs/turnstile": { version: ">=1.1.3" }
    }),
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const options = validateModuleOptions(rawOptions, turnstileOptionsSchema, log);
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

    nuxt.options.turnstile = defu(nuxt.options.turnstile, {});
    nuxt.options.turnstile.siteKey ??= options.siteKey;

    // The upstream module adds this preset from its own nitro:config hook after setup.
    // Wait until all modules finish registering hooks so this filter runs afterwards.
    nuxt.hook("modules:done", () => {
      nuxt.hook("nitro:config", (nitro) => {
        const imports = nitro.imports;
        if (!isRecord(imports) || !hasKey(imports, "presets")) return;

        const presets = imports.presets;
        if (!isArray(presets)) return;

        imports.presets = presets.filter((preset) => !isUpstreamTurnstileVerifierPreset(preset));
      });
    });

    transpileRuntime(nuxt, runtimeDir);
    addImportsDir(resolver.resolve(runtimeDir, "app", "composables"));
    addServerScanDir(resolver.resolve(runtimeDir, "server"));

    end();
  }
});
