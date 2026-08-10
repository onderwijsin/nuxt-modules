import { defineEventHandler } from "h3";
import { defineCachedEventHandler, useRuntimeConfig } from "nitropack/runtime";

import { getRedirectCacheBase } from "../../utils/cache";
import { getRedirectManifest } from "../../utils/storage";

const cache = useRuntimeConfig().redirects?.cache.index ?? {
  maxAge: 60,
  staleMaxAge: 300,
  swr: true
};

/** Returns the compact exact index and, when enabled, dynamic rules for client-side navigation. */
export default defineCachedEventHandler(
  defineEventHandler(async () => {
    const manifest = await getRedirectManifest();
    const response: { data: typeof manifest.exact; dynamic?: typeof manifest.dynamic } = {
      data: manifest.exact
    };
    if (useRuntimeConfig().redirects?.dynamicMatching) response.dynamic = manifest.dynamic;
    return response;
  }),
  {
    ...cache,
    group: "redirects",
    name: "index",
    base: getRedirectCacheBase(),
    getKey: () => "all"
  }
);
