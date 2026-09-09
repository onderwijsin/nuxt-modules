import { addImports, addPlugin, addServerImports } from "@nuxt/kit";
import { defu } from "defu";
import { transpileRuntime } from "@onderwijsin/nuxt-module-utils/build";

import { parseDirectusCommands } from "./commands";
import { DIRECTUS_TURNSTILE_ACTIONS } from "./turnstile";
import type { DirectusSetupContext } from "./setup-context";

/**
 * Exposes serializable Directus configuration to the app and Nitro runtimes.
 *
 * @param context Resolved module setup context.
 */
export function setupDirectusRuntimeConfig(context: DirectusSetupContext): void {
  const { baseUrl, nuxt, options } = context;
  const { user: _user, ...serializableAuthOptions } = options.client.auth;
  Object.assign(nuxt.options.runtimeConfig, {
    directusClient: defu(
      {
        baseUrl,
        ...(options.instance.proxyToken ? { proxyToken: options.instance.proxyToken } : {}),
        auth: {
          ...serializableAuthOptions,
          user: {
            enabled: options.client.auth.user.enabled,
            ...(options.client.auth.user.enabled ? { fields: options.client.auth.user.fields } : {})
          },
          turnstile: { ...options.client.auth.turnstile, actions: DIRECTUS_TURNSTILE_ACTIONS }
        },
        assets: {
          ...(options.client.assets.url ? { url: options.client.assets.url } : {}),
          publicOnly: options.client.assets.publicOnly,
          cache: options.client.assets.cache
        }
      },
      nuxt.options.runtimeConfig.directusClient
    )
  });
  nuxt.options.runtimeConfig.public.directusClient = defu(
    {
      proxy: { path: options.client.proxy.path },
      assets: { enabled: options.client.assets.enabled, path: options.client.assets.path },
      preview: options.client.preview,
      auth: {
        enabled: options.client.auth.enabled,
        magicLinks: { enabled: options.client.auth.magicLinks.enabled },
        maskSecretsInPlayground: options.client.auth.maskSecretsInPlayground,
        turnstile: {
          enabled: options.client.auth.turnstile.enabled,
          actions: DIRECTUS_TURNSTILE_ACTIONS
        }
      }
    },
    nuxt.options.runtimeConfig.public.directusClient
  );
}

/**
 * Registers the always-on Directus SDK imports, composables, and client/SSR plugins.
 *
 * @param context Resolved module setup context.
 */
export function setupDirectusClient(context: DirectusSetupContext): void {
  const { nuxt, options, resolver, runtimeDir } = context;
  for (const name of parseDirectusCommands(options.client.commands)) {
    addImports({ name, as: name, from: "@directus/sdk" });
  }
  transpileRuntime(nuxt, runtimeDir);
  addImports([
    { name: "useDirectus", from: resolver.resolve(runtimeDir, "client/app/use-directus") },
    { name: "useDirectusError", from: resolver.resolve(runtimeDir, "errors/use-directus-error") },
    {
      name: "useDirectusItemByPath",
      from: resolver.resolve(runtimeDir, "items/app/use-directus-item-by-path")
    }
  ]);
  addServerImports([
    {
      name: "useDirectusServer",
      from: resolver.resolve(runtimeDir, "client/server/use-directus-server")
    },
    {
      name: "useDirectusServerAuth",
      from: resolver.resolve(runtimeDir, "auth/server/use-directus-server-auth")
    },
    {
      name: "useDirectusServerItemByPath",
      from: resolver.resolve(runtimeDir, "items/server/use-directus-item-by-path")
    }
  ]);
  addPlugin({ src: resolver.resolve(runtimeDir, "client/app/browser-plugin"), mode: "client" });
  addPlugin({
    src: resolver.resolve(
      runtimeDir,
      options.client.auth.enabled ? "auth/app/ssr-session-plugin" : "client/app/ssr-plugin"
    ),
    mode: "server"
  });
}
