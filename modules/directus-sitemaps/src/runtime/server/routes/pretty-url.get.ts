import { defineEventHandler, getRequestURL, sendRedirect } from "h3";
import config from "#directus-sitemaps-config";
import { shouldUseNamedSitemaps } from "../utils/helpers";

// TODO does this also redirect named sitemaps? I think not... eg /sitemap/my-named-sitemap should also be redirected to their respective xml URLs

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
  return;
});
