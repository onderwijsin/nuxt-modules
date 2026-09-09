import type { ModuleDependencies } from "@nuxt/schema";
import { defu } from "defu";
import {
  addImports,
  addServerScanDir,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import {
  moduleDependenciesWhenEnabled,
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";
import { version } from "../package.json";
import { newsletterSignupOptionsSchema } from "./config/options.schema";
import type { ModuleOptions } from "./config/options.schema";

const MODULE_KEY = "newsletterSignup";
const MODULE_NAME = resolveModuleName(MODULE_KEY);
const DEFAULTS = {
  enabled: true,
  endpoint: { enabled: true, url: "/api/newsletter/signup" }
} satisfies Partial<ModuleOptions>;

/** Registers the provider-independent newsletter signup endpoint and client helpers. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: DEFAULTS,
  moduleDependencies: (nuxt): ModuleDependencies =>
    moduleDependenciesWhenEnabled(nuxt.options.newsletterSignup, {
      "@nuxt/ui": { version: ">=4.0.0" },
      "@onderwijsin/nuxt-simple-rate-limiter": { version: "*" }
    }),
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    addTypeTemplate({
      filename: "types/newsletter-signup-config.d.ts",
      src: resolver.resolve(runtimeDir, "types/config.d.ts")
    });
    if (!isEnabled()) return;

    const options = validateModuleOptions(rawOptions, newsletterSignupOptionsSchema, log);

    nuxt.options.runtimeConfig.newsletterSignup = defu(
      options,
      nuxt.options.runtimeConfig.newsletterSignup
    );
    const endpointUrl =
      options.endpoint?.enabled === false ? options.endpoint.url : DEFAULTS.endpoint.url;
    const existingPublicNewsletterSignup = nuxt.options.runtimeConfig.public.newsletterSignup;
    const publicNewsletterSignup = defu(existingPublicNewsletterSignup, {
      endpoint: { url: endpointUrl }
    });
    if (options.lists && !publicNewsletterSignup.lists) {
      publicNewsletterSignup.lists = {
        default: options.lists.default,
        options: options.lists.options?.map(({ label, id }) => ({ label, id }))
      };
    }
    nuxt.options.runtimeConfig.public.newsletterSignup = publicNewsletterSignup;

    transpileRuntime(nuxt, runtimeDir);
    addImports({
      name: "useNewsletterSignup",
      from: resolver.resolve(runtimeDir, "app/composables/newsletterSignup")
    });
    if (options.endpoint?.enabled !== false) {
      addServerScanDir(resolver.resolve(runtimeDir, "server"));
    }
    end();
  }
});
