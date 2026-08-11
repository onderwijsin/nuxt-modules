import { defineEventHandler, getRequestURL, sendRedirect } from "h3";

/**
 * Redirects the convenient sitemap path to @nuxtjs/sitemap's XML route.
 *
 * @param event Incoming pretty sitemap request.
 * @returns A permanent redirect for a recognized sitemap path.
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname.replace(/\/$/u, "");
  if (path === "/sitemap" || path === "/sitemap.xml") {
    return sendRedirect(event, "/sitemap_index.xml", 301);
  }
  return;
});
