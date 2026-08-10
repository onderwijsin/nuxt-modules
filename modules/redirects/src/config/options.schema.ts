import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

const cacheSchema = z.strictObject({
  maxAge: z.number().int().nonnegative().default(60),
  staleMaxAge: z.number().int().nonnegative().default(300),
  swr: z.boolean().default(true)
});

/** Runtime validation schema for redirects module options. */
export const redirectsOptionsSchema = z.strictObject({
  enabled: enabled.default(true),
  serverMiddleware: z.boolean().default(true),
  store: z.boolean().default(true),
  routeMiddleware: z.boolean().default(true),
  storageMount: z.string().trim().min(1).default("redirects"),
  storeRefreshInterval: z.number().int().positive().default(3600),
  excludedNamespaces: z
    .array(z.string().startsWith("/"))
    .default(["/api", "/_nuxt", "/_payload", "/__"]),
  excludedRoutes: z.array(z.string().startsWith("/")).default(["/"]),
  cache: z
    .strictObject({
      index: cacheSchema.default({ maxAge: 60, staleMaxAge: 300, swr: true }),
      lookup: cacheSchema.default({ maxAge: 60, staleMaxAge: 300, swr: true })
    })
    .default({
      index: { maxAge: 60, staleMaxAge: 300, swr: true },
      lookup: { maxAge: 60, staleMaxAge: 300, swr: true }
    })
});

export type RedirectsOptionsSchema = typeof redirectsOptionsSchema;
