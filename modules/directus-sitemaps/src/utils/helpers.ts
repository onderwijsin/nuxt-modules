import { isString, isRecord, isArray, fromEntries } from "@onderwijsin/nuxt-module-utils";
import type { ResolvedModuleOptions } from "../types/options";
import type { ModuleOptions as NuxtSitemapModuleOptions } from "@nuxtjs/sitemap";
import { defu } from "defu";
import { joinURL } from "ufo";

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
    const sitemapName = entry._sitemap;
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
  moduleOptions.sitemaps ??= {};
  if (!isRecord(moduleOptions.sitemaps)) {
    moduleOptions.sitemaps = {};
  }
  const currentSitemaps = moduleOptions.sitemaps;
  const namedSitemaps = fromEntries(
    sitemapNamespaces.map((name) => {
      const currentSitemap = currentSitemaps[name];
      const sources = isRecord(currentSitemap) ? currentSitemap.sources : undefined;
      return [name, { sources: [sourceApiEndpoint, ...(isArray(sources) ? sources : [])] }];
    })
  );
  moduleOptions.sitemaps = defu(namedSitemaps, currentSitemaps);
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
