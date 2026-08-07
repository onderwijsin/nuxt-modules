import {
  addImports,
  addServerScanDir,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "module-utils/shared";
import { version } from "../package.json";
import { newsletterSignupOptionsSchema } from "./config/options.schema";
import type { ModuleOptions } from "./types/options";

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
  moduleDependencies: { "@nuxt/ui": { version: ">=4.0.0" } },
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();
    const options = validateModuleOptions(rawOptions, newsletterSignupOptionsSchema, log);
    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    addTypeTemplate({
      filename: "types/newsletter-signup-config.d.ts",
      src: resolver.resolve(runtimeDir, "types/config.d.ts")
    });
    if (!isEnabled()) return;

    nuxt.options.runtimeConfig.newsletterSignup = options;
    const publicNewsletterSignup = nuxt.options.runtimeConfig.public.newsletterSignup ?? {
      endpoint: { url: options.endpoint?.url ?? DEFAULTS.endpoint.url }
    };
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
    if (options.endpoint?.enabled !== false)
      addServerScanDir(resolver.resolve(runtimeDir, "server"));
    end();
  }
});
