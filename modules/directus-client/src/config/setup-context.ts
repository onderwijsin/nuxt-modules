import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { createResolver, useLogger } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";
import { defu } from "defu";
import {
  directusSerializableUserConfigSchema,
  getResolvedDirectusConfig
} from "@onderwijsin/nuxt-directus-config/schema";
import { validateModuleOptions } from "@onderwijsin/nuxt-module-utils/build";
import { isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

import { directusResolvedClientOptionsSchema } from "./options.schema";
import { resolveDirectusSessionSecret } from "./session-secret";
import type { ModuleOptions, ResolvedExecutableModuleOptions } from "./options.schema";

type Resolver = ReturnType<typeof createResolver>;
type Logger = ReturnType<typeof useLogger>;

export interface DirectusSetupContext {
  baseUrl: string;
  directusConfigFile?: string;
  log: Logger;
  nuxt: Nuxt;
  options: ResolvedExecutableModuleOptions;
  rawUserConfig: NonNullable<NonNullable<ModuleOptions["client"]>["auth"]>["user"];
  resolver: Resolver;
  runtimeDir: string;
  sharedUserConfig: ResolvedExecutableModuleOptions["client"]["auth"]["user"] | undefined;
}

function resolveConfigFile(rootDir: string, configFile: string | false): string | undefined {
  if (configFile === false) return undefined;
  const path = isAbsolute(configFile) ? configFile : resolve(rootDir, configFile);
  return existsSync(path) ? path : undefined;
}

/**
 * Resolves and validates the complete executable Directus client configuration.
 *
 * @param rawOptions Consumer-provided module options.
 * @param nuxt Active Nuxt instance.
 * @param resolver Module-relative path resolver.
 * @param log Module logger.
 * @returns Shared context for capability registration.
 */
export function resolveDirectusSetupContext(
  rawOptions: ModuleOptions,
  nuxt: Nuxt,
  resolver: Resolver,
  log: Logger
): DirectusSetupContext {
  const sharedConfig = getResolvedDirectusConfig(nuxt);
  const mergedInput = defu(rawOptions, sharedConfig);
  const rawUserConfig = rawOptions.client?.auth?.user;
  const sharedUserConfig = sharedConfig?.client?.auth?.user;
  const input = {
    ...mergedInput,
    client: {
      ...mergedInput.client,
      auth: {
        ...mergedInput.client?.auth,
        user: rawUserConfig ?? sharedUserConfig ?? { enabled: false as const }
      }
    }
  };

  if (rawUserConfig !== undefined) directusSerializableUserConfigSchema.parse(rawUserConfig);

  const sessionSecret = resolveDirectusSessionSecret({
    configured: rawOptions.client?.auth?.sessionSecret ?? sharedConfig?.client?.auth?.sessionSecret,
    isCI: process.env.CI === "true",
    isPrepare: nuxt.options._prepare,
    isDevelopment: nuxt.options.dev
  });
  const authenticationEnabled =
    rawOptions.client?.auth?.enabled ?? sharedConfig?.client?.auth?.enabled;
  const validationOptions =
    authenticationEnabled && sessionSecret
      ? defu({ client: { auth: { sessionSecret } } }, input)
      : input;
  const options = validateModuleOptions(
    validationOptions,
    directusResolvedClientOptionsSchema,
    log
  );

  const directusConfigOptions = Reflect.get(nuxt.options, "directusConfig");
  const directusConfigFile = sharedConfig
    ? resolveConfigFile(
        nuxt.options.rootDir,
        isRecord(directusConfigOptions) &&
          (isString(directusConfigOptions.configFile) || directusConfigOptions.configFile === false)
          ? directusConfigOptions.configFile
          : "directus.config.ts"
      )
    : undefined;

  return {
    baseUrl: options.instance.baseUrl ?? "",
    directusConfigFile,
    log,
    nuxt,
    options,
    rawUserConfig,
    resolver,
    runtimeDir: resolver.resolve("./runtime"),
    sharedUserConfig
  };
}
