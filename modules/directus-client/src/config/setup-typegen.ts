import { join } from "node:path";
import { addTypeTemplate } from "@nuxt/kit";
import { defu } from "defu";
import { attempt, isString } from "@onderwijsin/nuxt-module-utils/shared";

import { resolveDirectusTypegenDeclaration } from "./typegen";
import { generateDirectusUserTypeDeclaration } from "./user-typegen";
import type { DirectusSetupContext } from "./setup-context";

/**
 * Registers Directus config and schema declarations, including the server TypeScript alias.
 *
 * @param context Resolved module setup context.
 */
export function setupDirectusTypegen(context: DirectusSetupContext): void {
  const {
    baseUrl,
    directusConfigFile,
    log,
    nuxt,
    options,
    rawUserConfig,
    resolver,
    runtimeDir,
    sharedUserConfig
  } = context;
  addTypeTemplate({
    filename: "types/directus-config.d.ts",
    src: resolver.resolve(runtimeDir, "typegen/config.d.ts")
  });
  const userTypes = addTypeTemplate({
    filename: "types/directus-user.d.ts",
    getContents: () =>
      generateDirectusUserTypeDeclaration(
        options.client.auth.user.enabled ? options.client.auth.user.fields : [],
        rawUserConfig === undefined && sharedUserConfig?.enabled && sharedUserConfig.mapper
          ? directusConfigFile
          : undefined,
        options.client.typegen.enabled
      )
  });
  const userTypesPath =
    userTypes?.dst ?? resolver.resolve(nuxt.options.buildDir, "types/directus-user.d.ts");
  addTypeTemplate({
    filename: "types/directus-schema.d.ts",
    getContents: async () => {
      const result = await attempt(() =>
        resolveDirectusTypegenDeclaration({
          enabled: options.client.typegen.enabled,
          directusUrl: baseUrl,
          directusToken: options.client.typegen.introspectionToken,
          augmentations: options.client.typegen.augmentations,
          rules: options.client.typegen.rules,
          transform: options.client.typegen.transform,
          cacheFile: join(nuxt.options.buildDir, "directus-typegen-cache.json"),
          generatedFile: join(nuxt.options.buildDir, "types/directus-schema.d.ts"),
          maxAge: options.client.typegen.cache.maxAge,
          isDevelopment: nuxt.options.dev,
          isCI: process.env.CI === "true",
          log
        })
      );
      if (isString(result.data)) return result.data;
      log.error("Directus schema type template failed.");
      throw result.error;
    }
  });
  nuxt.options.alias = defu(nuxt.options.alias, {});
  nuxt.options.alias["#directus"] = resolver.resolve(
    nuxt.options.buildDir,
    "types/directus-schema.d.ts"
  );
  nuxt.options.alias["#directus-user"] = userTypesPath;
  const nodeTsConfig = (nuxt.options.typescript.nodeTsConfig = defu(
    nuxt.options.typescript.nodeTsConfig,
    {}
  ));
  nodeTsConfig.compilerOptions = defu(nodeTsConfig.compilerOptions, {});
  nodeTsConfig.compilerOptions.paths = defu(nodeTsConfig.compilerOptions.paths, {});
  nodeTsConfig.compilerOptions.paths["#directus"] = ["./types/directus-schema"];
  nodeTsConfig.compilerOptions.paths["#directus-user"] = [userTypesPath];
}
