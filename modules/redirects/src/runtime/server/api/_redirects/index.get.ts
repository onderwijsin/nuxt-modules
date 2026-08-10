import { defineEventHandler } from "h3";
import { defineCachedEventHandler, useRuntimeConfig } from "nitropack/runtime";

import { getRedirectCacheBase } from "../../utils/cache";
import { getRedirectManifest } from "../../utils/storage";

const cache = useRuntimeConfig().redirects?.cache.index ?? {
  maxAge: 60,
  staleMaxAge: 300,
  swr: true
};

/** Returns the compact, active redirect index for client-side navigation. */
export default defineCachedEventHandler(
  defineEventHandler(async () => ({ data: (await getRedirectManifest()).redirects })),
  {
    ...cache,
    group: "redirects",
    name: "index",
    base: getRedirectCacheBase(),
    getKey: () => "all"
  }
);
