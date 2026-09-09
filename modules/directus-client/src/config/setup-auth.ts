import { addImports, addPlugin, addServerHandler, addServerPlugin, addTemplate } from "@nuxt/kit";
import { defu } from "defu";

import type { DirectusSetupContext } from "./setup-context";

/**
 * Registers authentication, optional magic-link, and current-user capabilities.
 *
 * @param context Resolved module setup context.
 */
export function setupDirectusAuth(context: DirectusSetupContext): void {
  const {
    directusConfigFile,
    nuxt,
    options,
    rawUserConfig,
    resolver,
    runtimeDir,
    sharedUserConfig
  } = context;
  if (!options.client.auth.enabled) return;
  addServerPlugin(resolver.resolve(runtimeDir, "auth/server/nitro-plugin"));
  addImports({
    name: "useDirectusAuth",
    from: resolver.resolve(runtimeDir, "auth/app/use-directus-auth")
  });
  for (const [name, method] of [
    ["login", "post"],
    ["refresh", "post"],
    ["logout", "post"],
    ["session", "get"],
    ["password-request", "post"],
    ["password-reset", "post"]
  ] as const) {
    addServerHandler({
      route: `/_directus/auth/${name}`,
      method,
      handler: resolver.resolve(runtimeDir, `auth/server/handlers/${name}.${method}`)
    });
  }
  if (options.client.auth.magicLinks.enabled) {
    for (const [name, method] of [
      ["magic-links/request", "post"],
      ["magic-links/redeem", "post"]
    ] as const) {
      addServerHandler({
        route: `/_directus/auth/${name}`,
        method,
        handler: resolver.resolve(runtimeDir, `auth/server/handlers/${name}.${method}`)
      });
    }
  }
  if (!options.client.auth.user.enabled) return;
  addImports({
    name: "useDirectusUser",
    from: resolver.resolve(runtimeDir, "user/app/use-directus-user")
  });
  const userHandler = addTemplate({
    filename: "server/handlers/directus-user.get.mjs",
    write: true,
    getContents: () => {
      const handler = resolver.resolve(runtimeDir, "user/server/create-handler");
      if (
        rawUserConfig !== undefined ||
        !directusConfigFile ||
        sharedUserConfig?.enabled !== true ||
        !sharedUserConfig.mapper
      ) {
        return `import { createDirectusUserHandler } from ${JSON.stringify(handler)};\nexport default createDirectusUserHandler();\n`;
      }
      return `import directusConfig from ${JSON.stringify(directusConfigFile)};\nimport { createDirectusUserHandler } from ${JSON.stringify(handler)};\nconst userConfig = directusConfig.client?.auth?.user;\nexport default createDirectusUserHandler(userConfig?.enabled ? userConfig.mapper : undefined);\n`;
    }
  });
  addServerHandler({ route: "/_directus/auth/user", method: "get", handler: userHandler.dst });
  nuxt.options.routeRules = defu(nuxt.options.routeRules, {});
  nuxt.options.routeRules["/_directus/auth/user"] = defu(
    { cache: false, prerender: false },
    nuxt.options.routeRules["/_directus/auth/user"]
  );
  addPlugin({ src: resolver.resolve(runtimeDir, "user/app/plugin.client"), mode: "client" });
}
