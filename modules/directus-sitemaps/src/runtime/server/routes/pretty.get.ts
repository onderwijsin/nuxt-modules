import { defineEventHandler, getRequestURL, sendRedirect } from "h3";

/**
 * Redirects legacy pretty sitemap paths to @nuxtjs/sitemap XML routes.
 *
 * @param event Incoming pretty sitemap request.
 * @returns A permanent redirect for a recognized sitemap path.
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname.replace(/\/$/u, "");
  if (path === "/sitemap" || path === "/sitemap.xml") {
    return sendRedirect(event, "/sitemap_index.xml", 301);
  }
  const match = /^\/sitemap\/([A-Za-z0-9_-]+)(?:\.xml)?$/u.exec(path);
  if (!match) return;
  return sendRedirect(event, `/${match[1]}-sitemap.xml`, 301);
});
