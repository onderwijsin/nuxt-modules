import { defineEventHandler, getRequestURL, sendRedirect } from "h3";
import config from "#directus-sitemaps-config";

/**
 * Redirects the convenient sitemap path to the generated sitemap XML route.
 *
 * @param event Incoming pretty sitemap request.
 * @returns A permanent redirect for a recognized sitemap path.
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname.replace(/\/$/u, "");
  if (path === "/sitemap" || path === "/sitemap.xml") {
    const hasNamedSitemaps =
      config.collections.some(
        (collection) => collection.sitemap !== false && Boolean(collection.sitemap._sitemap)
      ) || config.static.some((entry) => Boolean(entry._sitemap));
    return sendRedirect(event, hasNamedSitemaps ? "/sitemap_index.xml" : "/sitemap.xml", 301);
  }
  return;
});
