import { addServerHandler, addServerPlugin } from "@nuxt/kit";
import { defu } from "defu";

import type { DirectusSetupContext } from "./setup-context";

function disableRouteCaching(context: DirectusSetupContext, route: string): void {
  context.nuxt.options.routeRules = defu(context.nuxt.options.routeRules, {});
  context.nuxt.options.routeRules[route] = defu(
    { cache: false, prerender: false },
    context.nuxt.options.routeRules[route]
  );
}

/**
 * Registers the Directus API proxy and its non-cacheable route boundary.
 *
 * @param context Resolved module setup context.
 */
export function setupDirectusProxy(context: DirectusSetupContext): void {
  const { options, resolver, runtimeDir } = context;
  const route = `${options.client.proxy.path}/**`;
  addServerHandler({ route, handler: resolver.resolve(runtimeDir, "proxy/handler") });
  disableRouteCaching(context, route);
}

/**
 * Registers the optional asset proxy and cache invalidation plugin.
 *
 * @param context Resolved module setup context.
 */
export function setupDirectusAssets(context: DirectusSetupContext): void {
  const { options, resolver, runtimeDir } = context;
  if (!options.client.assets.enabled) return;
  if (options.client.assets.cache.enabled) {
    addServerPlugin(resolver.resolve(runtimeDir, "assets/nitro-plugin"));
  }
  const route = `${options.client.assets.path}/**`;
  addServerHandler({
    route,
    handler: resolver.resolve(
      runtimeDir,
      options.client.assets.cache.enabled ? "assets/cached-handler" : "assets/uncached-handler"
    )
  });
  disableRouteCaching(context, route);
}
