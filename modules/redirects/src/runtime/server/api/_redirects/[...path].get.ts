import { createError, defineEventHandler, getRequestURL } from "h3";
import { defineCachedEventHandler, useRuntimeConfig } from "nitropack/runtime";

import { findRedirect } from "../../utils/storage";
import { hashRedirectLookupOrigin } from "../../utils/cache";

const cache = useRuntimeConfig().redirects?.cache.lookup ?? {
  maxAge: 60,
  staleMaxAge: 300,
  swr: true
};
const LOOKUP_PREFIX = "/api/_redirects/";

/** Looks up a single client navigation redirect without loading the Pinia store. */
export default defineCachedEventHandler(
  defineEventHandler(async (event) => {
    // Router parameters decode `%3F` before this handler sees them, which makes an origin query
    // indistinguishable from this endpoint's own query. Read the encoded pathname instead.
    const encodedPath = getRequestURL(event).pathname.slice(LOOKUP_PREFIX.length);
    if (!encodedPath)
      throw createError({ statusCode: 400, statusMessage: "Redirect path is required" });

    let path: string;
    try {
      path = decodeURIComponent(encodedPath);
    } catch {
      throw createError({ statusCode: 400, statusMessage: "Redirect path is invalid" });
    }
    if (!path.startsWith("/")) path = `/${path}`;
    return { data: await findRedirect(path) };
  }),
  {
    ...cache,
    group: "redirects",
    name: "lookup",
    getKey: (event) => {
      const encodedPath = getRequestURL(event).pathname.slice(LOOKUP_PREFIX.length);
      try {
        return hashRedirectLookupOrigin(decodeURIComponent(encodedPath));
      } catch {
        return hashRedirectLookupOrigin(encodedPath);
      }
    }
  }
);
