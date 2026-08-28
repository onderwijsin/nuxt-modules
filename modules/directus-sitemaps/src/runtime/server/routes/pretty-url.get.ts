import { defineEventHandler, getRequestURL, sendRedirect } from "h3";
import { useRuntimeConfig } from "#imports";
import { joinURL } from "ufo";
import { isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";
import config from "#directus-sitemaps-config";
import { shouldUseNamedSitemaps } from "../utils/helpers";

/**
 * Redirects the convenient sitemap path to the generated sitemap XML route.
 *
 * @param event Incoming pretty sitemap request.
 * @returns A permanent redirect for a recognized sitemap path.
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname.replace(/\/$/u, "");
  if (path === "/sitemap" || path === "/sitemap.xml") {
    return sendRedirect(
      event,
      shouldUseNamedSitemaps(config) ? "/sitemap_index.xml" : "/sitemap.xml",
      301
    );
  }
  const runtimeConfig = useRuntimeConfig(event);
  const pathPrefix =
    isRecord(runtimeConfig) && isString(runtimeConfig.sitemapsPathPrefix)
      ? runtimeConfig.sitemapsPathPrefix
      : "/__sitemap__/";
  if (path.startsWith(pathPrefix) && path !== pathPrefix && !path.endsWith(".xml")) {
    return sendRedirect(event, joinURL(path, ".xml"), 301);
  }
  return;
});
