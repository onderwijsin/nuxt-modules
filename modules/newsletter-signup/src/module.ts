import type { ModuleDependencies } from "@nuxt/schema";
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

    validateNewsletterSignupOptions(rawOptions, log);
    const options = validateModuleOptions(rawOptions, newsletterSignupOptionsSchema, log);

    nuxt.options.runtimeConfig.newsletterSignup = options;
    const endpointUrl =
      options.endpoint?.enabled === false ? options.endpoint.url : DEFAULTS.endpoint.url;
    const publicNewsletterSignup = nuxt.options.runtimeConfig.public.newsletterSignup ?? {
      endpoint: { url: endpointUrl }
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
    if (options.endpoint?.enabled !== false) {
      addServerScanDir(resolver.resolve(runtimeDir, "server"));
    }
    end();
  }
});

/**
 * Validates newsletter options whose requirements span multiple fields.
 * @param options - The newsletter signup module options.
 * @param log - The module logger.
 */
function validateNewsletterSignupOptions(
  options: ModuleOptions,
  log: { info: (message: string) => void }
): void {
  if (options.endpoint?.enabled === false && !options.endpoint.url) {
    log.info("endpoint.url is required when endpoint registration is disabled");
    throw new Error("Invalid module options ☝. Exiting.");
  }

  const hasProviderConfiguration = Boolean(
    options.provider || options.apiKey || options.server || options.lists || options.fields
  );
  if (!hasProviderConfiguration) return;

  if (options.provider === "mailchimp") {
    if (!options.lists?.options?.length && !options.server) {
      log.info("server is required for Mailchimp when no per-audience server is configured");
      throw new Error("Invalid module options ☝. Exiting.");
    }
    if (options.lists?.options?.some((option) => !option.server)) {
      log.info("Each Mailchimp list option requires its server value");
      throw new Error("Invalid module options ☝. Exiting.");
    }
  }

  if (!options.lists?.default && !options.lists?.options?.length) {
    log.info("Configure lists.default or lists.options");
    throw new Error("Invalid module options ☝. Exiting.");
  }
}
