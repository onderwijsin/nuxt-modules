import { isString, isRecord, isArray, fromEntries } from "@onderwijsin/nuxt-module-utils";
import type { ResolvedModuleOptions } from "../types/options";
import type { ModuleOptions as NuxtSitemapModuleOptions } from "@nuxtjs/sitemap";
import { defu } from "defu";
import { joinURL } from "ufo";

/**
 * Gets the value of the specified property from the given object.
 *
 * @param obj The object to retrieve the property from.
 * @param prop The property key to retrieve.
 * @returns The value of the specified property.
 */
export const get = <T extends object, K extends keyof T>(obj: T, prop: K) => Reflect.get(obj, prop);

/**
 * Sets the value of the specified property on the given object that was retrieved using Reflect.get
 * (or via the `get` alias).
 *
 * @param obj The object to set the property on.
 * @param prop The property key to set.
 * @param value The value to set for the property.
 * @returns A boolean indicating whether the property was successfully set.
 */
export const set = <T extends object, K extends keyof T>(obj: T, prop: K, value: T[K]) =>
  Reflect.set(obj, prop, value);

/**
 * Resolve unique sitemap namespaces for the given sitemap configuration.
 * @param options - the resolved module options
 * @returns An array of unique sitemap names.
 */
export function resolveSitemapNamespaces(options: ResolvedModuleOptions): string[] {
  const names = new Set<string>();

  for (const collection of options.collections ?? []) {
    if (collection.sitemap !== false && collection.sitemap._sitemap) {
      names.add(collection.sitemap._sitemap);
    }
  }
  for (const entry of options.static ?? []) {
    const sitemapName = get(entry, "_sitemap");
    if (isString(sitemapName) && sitemapName.trim()) names.add(sitemapName);
  }
  return [...names];
}

/**
 * Registers namespaces for individual sitemaps in the @nuxtjs/sitemap module options.
 * Any config that is already provided to the @nuxtjs/sitemap module will be merged with the registered namespaces.
 * @param moduleOptions - Module options object from the @nuxtjs/sitemap module
 * @param sitemapNamespaces - An array of sitemap namespaces to register.
 * @param sourceApiEndpoint - The API endpoint for the sitemap source.
 */
export function registerSitemapNamespaces(
  moduleOptions: NuxtSitemapModuleOptions,
  sitemapNamespaces: string[],
  sourceApiEndpoint: string
): void {
  if (sitemapNamespaces.length === 0) {
    console.warn(
      `registerSitemapNamespaces was invoked without any sitemap namespaces to register. This is likely a misconfiguration or bug.`
    );
    return;
  }
  const preExitsingNamespaces = get(moduleOptions, "sitemaps");
  const currentSitemaps = isRecord(preExitsingNamespaces) ? preExitsingNamespaces : {};
  const namedSitemaps = fromEntries(
    sitemapNamespaces.map((name) => {
      const currentSitemap = get(currentSitemaps, name);
      const sources = isRecord(currentSitemap) ? get(currentSitemap, "sources") : undefined;
      return [name, { sources: [sourceApiEndpoint, ...(isArray(sources) ? sources : [])] }];
    })
  );
  set(moduleOptions, "sitemaps", defu(namedSitemaps, currentSitemaps));
}

/**
 * Resolve the relative routes for namespaced sitemaps.
 * @param namespace - The sitemap namespace.
 * @param pathPrefix - The path prefix for the sitemap.
 * @returns The sitemap route.
 */
export function resolveNamespacedSitemapRoute(namespace: string, pathPrefix: string): string {
  return joinURL(pathPrefix, `${namespace}.xml`);
}
